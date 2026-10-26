import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreditsService } from '../credits/credits.service.js';
import {
  NotificationsService,
  type NotifyInput,
} from '../notifications/notifications.service.js';
import { JobsService, SHORTLIST_CAP } from './jobs.service.js';

type Tx = Prisma.TransactionClient;

/**
 * Homeowner-side hiring lifecycle (MyBuilder flow):
 *   INTERESTED --shortlist--> SHORTLISTED (credits charged, contacts exchanged, chat opens)
 *   INTERESTED --decline----> DECLINED   (credits released)
 *   SHORTLISTED --hire------> HIRED      (job HIRED; everyone else NOT_SELECTED)
 *   job HIRED --complete----> COMPLETED  (review prompted)
 *   job ACTIVE/HIRED --close-> CLOSED    (open leads NOT_SELECTED, reserves released)
 * Each transition is one transaction; notifications are sent after commit.
 */
@Injectable()
export class HiringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly notifications: NotificationsService,
    private readonly jobs: JobsService,
  ) {}

  private async loadLead(jobId: string, leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.jobId !== jobId)
      throw new NotFoundException('Response not found');
    return lead;
  }

  // ── Shortlist ─────────────────────────────────────────────────────────────

  async shortlist(idOrNumber: string, homeownerId: string, leadId: string) {
    const job = await this.jobs.getOwnedJob(idOrNumber, homeownerId);
    if (job.status !== 'ACTIVE')
      throw new BadRequestException('This job is no longer open');

    const result = await this.prisma.$transaction(
      async (tx) => {
        const lead = await tx.lead.findUnique({ where: { id: leadId } });
        if (!lead || lead.jobId !== job.id)
          throw new NotFoundException('Response not found');
        if (lead.status !== 'INTERESTED') {
          throw new BadRequestException(
            'Only tradespeople who expressed interest can be shortlisted',
          );
        }
        const shortlisted = await tx.lead.count({
          where: { jobId: job.id, status: { in: ['SHORTLISTED', 'HIRED'] } },
        });
        if (shortlisted >= SHORTLIST_CAP) {
          throw new BadRequestException(
            `You can shortlist up to ${SHORTLIST_CAP} tradespeople per job`,
          );
        }

        // Charge the credits reserved when the trade expressed interest.
        if (lead.creditsReserved > 0) {
          await this.credits.charge(
            tx,
            lead.tradespersonId,
            lead.id,
            lead.creditsReserved,
          );
        }
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            status: 'SHORTLISTED',
            shortlistedAt: new Date(),
            creditsCharged: lead.creditsReserved,
            creditsReserved: 0,
          },
        });

        // Contact details are now shared and messaging opens, seeded with the trade's intro.
        const conversation = await tx.conversation.upsert({
          where: {
            jobId_homeownerId_tradespersonId: {
              jobId: job.id,
              homeownerId,
              tradespersonId: lead.tradespersonId,
            },
          },
          create: {
            jobId: job.id,
            homeownerId,
            tradespersonId: lead.tradespersonId,
            ...(lead.interestMessage
              ? {
                  messages: {
                    create: {
                      senderId: lead.tradespersonId,
                      body: lead.interestMessage,
                    },
                  },
                }
              : {}),
          },
          update: {},
        });
        return {
          tradespersonId: lead.tradespersonId,
          conversationId: conversation.id,
          charged: lead.creditsReserved,
        };
      },
      { isolationLevel: 'Serializable' },
    );

    const homeowner = await this.prisma.user.findUniqueOrThrow({
      where: { id: homeownerId },
      select: { name: true, phone: true, email: true },
    });
    void this.notifications.notify({
      userId: result.tradespersonId,
      type: 'SHORTLISTED',
      title: `You've been shortlisted for "${job.title}"`,
      body: `${result.charged} credits have been charged. Get in touch with ${homeowner.name} to discuss the job.`,
      linkUrl: `/tradesperson/my-leads/${leadId}`,
      email: {
        subject: `You've been shortlisted: ${job.title}`,
        heading: "Good news — you've been shortlisted",
        paragraphs: [
          `${homeowner.name} has shortlisted you for "${job.title}" in ${job.placeName ?? job.postcode}.`,
          `Contact: ${homeowner.phone ?? 'no phone given'} · ${homeowner.email}`,
          `${result.charged} credits have been charged for this lead. Get in touch as soon as you can — customers respond best within 48 hours.`,
        ],
        ctaLabel: 'View job & message the customer',
      },
    });
    return {
      leadId,
      status: 'SHORTLISTED',
      conversationId: result.conversationId,
    };
  }

  // ── Decline interest ──────────────────────────────────────────────────────

  async decline(
    idOrNumber: string,
    homeownerId: string,
    leadId: string,
    reason?: string,
  ) {
    const job = await this.jobs.getOwnedJob(idOrNumber, homeownerId);
    const lead = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id: leadId } });
      if (!lead || lead.jobId !== job.id)
        throw new NotFoundException('Response not found');
      if (lead.status !== 'INTERESTED') {
        throw new BadRequestException(
          lead.status === 'SHORTLISTED'
            ? "You can't remove a tradesperson after contact details have been shared"
            : 'This response can no longer be declined',
        );
      }
      await this.credits.release(
        tx,
        lead.tradespersonId,
        lead.id,
        lead.creditsReserved,
        'Interest declined',
      );
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'DECLINED',
          declinedAt: new Date(),
          creditsReserved: 0,
        },
      });
      await tx.quote.updateMany({
        where: {
          jobId: job.id,
          tradespersonId: lead.tradespersonId,
          status: 'PENDING',
        },
        data: { status: 'DECLINED' },
      });
      return lead;
    });

    void this.notifications.notify({
      userId: lead.tradespersonId,
      type: 'INTEREST_DECLINED',
      title: `The customer chose not to go ahead with you for "${job.title}"`,
      body: `${lead.creditsReserved} reserved credits have been returned to your balance.${reason ? ` Reason: ${reason}` : ''}`,
      linkUrl: `/tradesperson/my-leads/${lead.id}`,
    });
    return { leadId, status: 'DECLINED' };
  }

  // ── Hire ──────────────────────────────────────────────────────────────────

  async hire(idOrNumber: string, homeownerId: string, leadId: string) {
    const job = await this.jobs.getOwnedJob(idOrNumber, homeownerId);
    if (job.status !== 'ACTIVE')
      throw new BadRequestException('This job is no longer open');

    const { hired, others } = await this.prisma.$transaction(
      async (tx) => {
        const lead = await tx.lead.findUnique({ where: { id: leadId } });
        if (!lead || lead.jobId !== job.id)
          throw new NotFoundException('Response not found');
        if (lead.status !== 'SHORTLISTED') {
          throw new BadRequestException(
            'Shortlist a tradesperson before hiring them',
          );
        }
        await tx.lead.update({
          where: { id: lead.id },
          data: { status: 'HIRED', hiredAt: new Date() },
        });
        await tx.job.update({
          where: { id: job.id },
          data: {
            status: 'HIRED',
            hiredTradespersonId: lead.tradespersonId,
            hiredAt: new Date(),
          },
        });
        await tx.quote.updateMany({
          where: {
            jobId: job.id,
            tradespersonId: lead.tradespersonId,
            status: 'PENDING',
          },
          data: { status: 'ACCEPTED' },
        });
        await tx.quote.updateMany({
          where: {
            jobId: job.id,
            tradespersonId: { not: lead.tradespersonId },
            status: 'PENDING',
          },
          data: { status: 'DECLINED' },
        });
        const others = await this.closeOpenLeads(
          tx,
          job.id,
          'Another tradesperson was hired',
          lead.id,
        );
        return { hired: lead, others };
      },
      { isolationLevel: 'Serializable' },
    );

    void this.notifications.notifyMany([
      {
        userId: hired.tradespersonId,
        type: 'HIRED',
        title: `You've been hired for "${job.title}"`,
        linkUrl: `/tradesperson/my-leads/${hired.id}`,
        email: {
          subject: `You've been hired: ${job.title}`,
          paragraphs: [
            `The customer has confirmed they're hiring you for "${job.title}".`,
            'Once the work is finished, you can ask them to leave a review from the lead page.',
          ],
          ctaLabel: 'View job',
        },
      },
      ...this.notSelectedNotices(job.title, others),
    ]);
    return { leadId, status: 'HIRED', jobStatus: 'HIRED' };
  }

  /** "Accept quote" is hiring the trade who sent it (shortlisting first if needed). */
  async acceptQuote(quoteId: string, homeownerId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    const lead = await this.prisma.lead.findUnique({
      where: {
        jobId_tradespersonId: {
          jobId: quote.jobId,
          tradespersonId: quote.tradespersonId,
        },
      },
    });
    if (!lead) throw new NotFoundException('Response not found');
    if (lead.status === 'INTERESTED')
      await this.shortlist(quote.jobId, homeownerId, lead.id);
    return this.hire(quote.jobId, homeownerId, lead.id);
  }

  // ── Complete ──────────────────────────────────────────────────────────────

  async complete(idOrNumber: string, homeownerId: string) {
    const job = await this.jobs.getOwnedJob(idOrNumber, homeownerId);
    if (job.status !== 'HIRED' || !job.hiredTradespersonId) {
      throw new BadRequestException(
        'Only jobs with a hired tradesperson can be marked complete',
      );
    }
    await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }),
      this.prisma.tradespersonProfile.update({
        where: { userId: job.hiredTradespersonId },
        data: { completedJobs: { increment: 1 } },
      }),
    ]);
    void this.notifications.notify({
      userId: job.hiredTradespersonId,
      type: 'JOB_COMPLETED',
      title: `"${job.title}" has been marked as complete`,
      body: 'The customer has been asked to leave a review.',
      linkUrl: `/tradesperson/profile?tab=reviews`,
    });
    return { id: job.id, status: 'COMPLETED' };
  }

  // ── Close (homeowner cancels / no longer needs a trade) ──────────────────

  async close(idOrNumber: string, homeownerId: string, reason?: string) {
    const job = await this.jobs.getOwnedJob(idOrNumber, homeownerId);
    if (job.status !== 'ACTIVE' && job.status !== 'HIRED') {
      throw new BadRequestException('This job is already closed');
    }
    const affected = await this.prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: job.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closeReason: reason ?? null,
        },
      });
      return this.closeOpenLeads(tx, job.id, 'Job closed by the customer');
    });

    void this.notifications.notifyMany(
      affected.map<NotifyInput>((l) => ({
        userId: l.tradespersonId,
        type: 'JOB_CLOSED',
        title: `The customer closed "${job.title}"`,
        body:
          l.released > 0
            ? `${l.released} reserved credits have been returned to your balance.`
            : undefined,
        linkUrl: `/tradesperson/my-leads/${l.id}`,
      })),
    );
    return { id: job.id, status: 'CLOSED' };
  }

  /**
   * Move every still-open lead on a job to NOT_SELECTED, releasing reserved
   * credits. Used by hire, close and job expiry. Returns trades that had
   * engaged (for notifications); untouched AVAILABLE leads are closed silently.
   */
  async closeOpenLeads(
    tx: Tx,
    jobId: string,
    note: string,
    exceptLeadId?: string,
  ) {
    const open = await tx.lead.findMany({
      where: {
        jobId,
        status: { in: ['AVAILABLE', 'INTERESTED', 'SHORTLISTED'] },
        ...(exceptLeadId ? { id: { not: exceptLeadId } } : {}),
      },
    });
    const engaged: { id: string; tradespersonId: string; released: number }[] =
      [];
    for (const lead of open) {
      if (lead.creditsReserved > 0) {
        await this.credits.release(
          tx,
          lead.tradespersonId,
          lead.id,
          lead.creditsReserved,
          note,
        );
      }
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'NOT_SELECTED',
          notSelectedAt: new Date(),
          creditsReserved: 0,
        },
      });
      if (lead.status !== 'AVAILABLE' || lead.invited) {
        engaged.push({
          id: lead.id,
          tradespersonId: lead.tradespersonId,
          released: lead.creditsReserved,
        });
      }
    }
    return engaged;
  }

  private notSelectedNotices(
    title: string,
    leads: { id: string; tradespersonId: string; released: number }[],
  ) {
    return leads.map<NotifyInput>((l) => ({
      userId: l.tradespersonId,
      type: 'NOT_SELECTED',
      title: `The customer hired someone else for "${title}"`,
      body:
        l.released > 0
          ? `${l.released} reserved credits have been returned to your balance.`
          : undefined,
      linkUrl: `/tradesperson/my-leads/${l.id}`,
    }));
  }
}
