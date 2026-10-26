import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreditRequestReason, LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PostcodeService } from '../../common/postcode.service.js';
import { haversineMiles } from '../../common/geo.js';
import type {
  GetLeadsQueryDto,
  LeadTab,
  LeadsCountQueryDto,
} from './dto/get-leads-query.dto.js';
import type {
  ExpressInterestDto,
  QuoteDto,
} from './dto/express-interest.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_REQUEST_COOLDOWN_DAYS = 3;
const CREDIT_REQUEST_MAX_DAYS = 20;
const UNREACHABLE_MIN_DAYS = 7;

const ARCHIVED: LeadStatus[] = [
  'DECLINED',
  'WITHDRAWN',
  'NOT_SELECTED',
  'EXPIRED',
];

const leadInclude = {
  job: {
    include: {
      attachments: { orderBy: { createdAt: 'asc' as const } },
      homeowner: { select: { id: true, name: true, email: true, phone: true } },
    },
  },
  creditRequest: true,
} satisfies Prisma.LeadInclude;

type LeadWithJob = Prisma.LeadGetPayload<{ include: typeof leadInclude }>;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly notifications: NotificationsService,
    private readonly postcode: PostcodeService,
  ) {}

  // ── Shapes ────────────────────────────────────────────────────────────────

  private tabWhere(tab: LeadTab): Prisma.LeadWhereInput {
    const now = new Date();
    switch (tab) {
      case 'new':
        return {
          status: 'AVAILABLE',
          dismissedAt: null,
          expiresAt: { gt: now },
          job: { status: 'ACTIVE' },
        };
      case 'interested':
        return { status: 'INTERESTED' };
      case 'shortlisted':
        return { status: 'SHORTLISTED' };
      case 'hired':
        return { status: 'HIRED' };
      case 'archived':
        return {
          OR: [
            { status: { in: ARCHIVED } },
            {
              status: 'AVAILABLE',
              OR: [{ dismissedAt: { not: null } }, { expiresAt: { lte: now } }],
            },
          ],
        };
    }
  }

  /**
   * Trade-facing lead. Until the homeowner shortlists the trade, only the
   * district, place name and first name are revealed (MyBuilder rule).
   */
  private serialize(
    lead: LeadWithJob,
    opts: { detail: boolean; canAct: boolean },
  ) {
    const job = lead.job;
    const shared = !!lead.shortlistedAt;
    const firstName = job.homeowner.name.split(' ')[0];
    const expired =
      lead.status === 'EXPIRED' ||
      (lead.status === 'AVAILABLE' &&
        !!lead.expiresAt &&
        lead.expiresAt <= new Date());
    return {
      id: lead.id,
      status: expired && lead.status === 'AVAILABLE' ? 'EXPIRED' : lead.status,
      creditCost: lead.creditCost,
      creditsReserved: lead.creditsReserved,
      creditsCharged: lead.creditsCharged,
      distanceMiles: lead.distanceMiles,
      invited: lead.invited,
      dismissed: !!lead.dismissedAt,
      interestMessage: lead.interestMessage,
      createdAt: lead.createdAt,
      expiresAt: lead.expiresAt,
      interestedAt: lead.interestedAt,
      shortlistedAt: lead.shortlistedAt,
      hiredAt: lead.hiredAt,
      declinedAt: lead.declinedAt,
      notSelectedAt: lead.notSelectedAt,
      reviewRequestedAt: lead.reviewRequestedAt,
      canExpressInterest:
        opts.canAct &&
        lead.status === 'AVAILABLE' &&
        !expired &&
        job.status === 'ACTIVE',
      job: {
        id: job.id,
        jobNumber: job.jobNumber,
        title: job.title,
        description: opts.detail
          ? job.description
          : job.description.slice(0, 280),
        serviceSlug: job.serviceSlug,
        tradeSlug: job.tradeSlug,
        status: job.status,
        placeName: job.placeName,
        postcodeDistrict: job.postcodeDistrict,
        postcode: shared ? job.postcode : null,
        createdAt: job.createdAt,
        ...(opts.detail
          ? {
              answers: Array.isArray(job.answersJson) ? job.answersJson : [],
              attachments: job.attachments.map((a) => ({
                id: a.id,
                fileUrl: a.fileUrl,
                fileName: a.fileName,
                mimeType: a.mimeType,
              })),
            }
          : { attachmentCount: job.attachments.length }),
      },
      homeowner: {
        firstName,
        name: shared ? job.homeowner.name : null,
        phone: shared ? job.homeowner.phone : null,
        email: shared ? job.homeowner.email : null,
      },
      creditRequest: lead.creditRequest
        ? {
            id: lead.creditRequest.id,
            reason: lead.creditRequest.reason,
            status: lead.creditRequest.status,
            adminNote: lead.creditRequest.adminNote,
            createdAt: lead.creditRequest.createdAt,
          }
        : null,
    };
  }

  private async isApproved(tradespersonId: string) {
    const p = await this.prisma.tradespersonProfile.findUnique({
      where: { userId: tradespersonId },
      select: { verificationStatus: true },
    });
    return p?.verificationStatus === 'APPROVED';
  }

  private async getOwnLead(leadId: string, tradespersonId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: leadInclude,
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.tradespersonId !== tradespersonId)
      throw new ForbiddenException('Access denied');
    return lead;
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async getLeads(tradespersonId: string, query: GetLeadsQueryDto) {
    const {
      tab = 'new',
      serviceSlug,
      maxDistanceMiles,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      perPage = 20,
    } = query;
    const where: Prisma.LeadWhereInput = {
      tradespersonId,
      AND: [
        this.tabWhere(tab),
        serviceSlug ? { job: { serviceSlug } } : {},
        maxDistanceMiles
          ? {
              OR: [
                { distanceMiles: { lte: maxDistanceMiles } },
                { invited: true },
              ],
            }
          : {},
      ],
    };
    const [total, leads, canAct] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        orderBy: [{ invited: 'desc' }, { [sort]: order }],
        skip: (page - 1) * perPage,
        take: perPage,
        include: leadInclude,
      }),
      this.isApproved(tradespersonId),
    ]);
    return {
      data: leads.map((l) => this.serialize(l, { detail: false, canAct })),
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  /** Counts per tab for the "My leads" badges. */
  async getSummary(tradespersonId: string) {
    const tabs: LeadTab[] = [
      'new',
      'interested',
      'shortlisted',
      'hired',
      'archived',
    ];
    const counts = await Promise.all(
      tabs.map((t) =>
        this.prisma.lead.count({
          where: { tradespersonId, ...this.tabWhere(t) },
        }),
      ),
    );
    return Object.fromEntries(tabs.map((t, i) => [t, counts[i]]));
  }

  async getLead(leadId: string, tradespersonId: string) {
    const lead = await this.getOwnLead(leadId, tradespersonId);
    const [canAct, quote, conversation, review] = await Promise.all([
      this.isApproved(tradespersonId),
      this.prisma.quote.findUnique({
        where: { jobId_tradespersonId: { jobId: lead.jobId, tradespersonId } },
      }),
      this.prisma.conversation.findFirst({
        where: { jobId: lead.jobId, tradespersonId },
        select: { id: true },
      }),
      this.prisma.review.findFirst({
        where: { jobId: lead.jobId, subjectId: tradespersonId, hiddenAt: null },
        select: { id: true, rating: true, comment: true, createdAt: true },
      }),
    ]);
    return {
      ...this.serialize(lead, { detail: true, canAct }),
      verificationRequired: !canAct,
      quote: quote
        ? {
            id: quote.id,
            message: quote.message,
            amountPence: quote.amountPence,
            estimateRange: quote.estimateRange,
            status: quote.status,
            updatedAt: quote.updatedAt,
          }
        : null,
      conversationId: conversation?.id ?? null,
      review,
    };
  }

  /** Public: active jobs within a radius of a postcode (trust signal on sign-up/work-area). */
  async countLeadsNear(query: LeadsCountQueryDto) {
    const geo = await this.postcode.geocode(query.postcode);
    const services = (query.services ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const jobs = await this.prisma.job.findMany({
      where: {
        status: 'ACTIVE',
        createdAt: { gt: new Date(Date.now() - 30 * DAY_MS) },
        latitude: { not: null },
        longitude: { not: null },
        ...(services.length ? { serviceSlug: { in: services } } : {}),
      },
      select: { latitude: true, longitude: true },
    });
    const radius = query.radius ?? 25;
    const count = jobs.filter(
      (j) =>
        haversineMiles(
          geo.latitude,
          geo.longitude,
          j.latitude!,
          j.longitude!,
        ) <= radius,
    ).length;
    return { count, radius, days: 30 };
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async expressInterest(
    leadId: string,
    tradespersonId: string,
    dto: ExpressInterestDto,
  ) {
    if (!(await this.isApproved(tradespersonId))) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'VERIFICATION_REQUIRED',
        message:
          'Your profile needs to be verified before you can respond to leads.',
      });
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const lead = await tx.lead.findUnique({
          where: { id: leadId },
          include: { job: true },
        });
        if (!lead) throw new NotFoundException('Lead not found');
        if (lead.tradespersonId !== tradespersonId)
          throw new ForbiddenException('Access denied');
        if (lead.status !== 'AVAILABLE') {
          throw new BadRequestException(
            `You've already responded to this lead`,
          );
        }
        if (lead.expiresAt && lead.expiresAt <= new Date()) {
          throw new BadRequestException('This lead has expired');
        }
        if (lead.job.status !== 'ACTIVE') {
          throw new BadRequestException(
            'This job is no longer accepting responses',
          );
        }

        await this.credits.reserve(
          tx,
          tradespersonId,
          lead.id,
          lead.creditCost,
        );
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            status: 'INTERESTED',
            interestedAt: new Date(),
            interestMessage: dto.message,
            creditsReserved: lead.creditCost,
            dismissedAt: null,
          },
        });

        if (dto.quoteAmountPence || dto.estimateRange) {
          await tx.quote.upsert({
            where: {
              jobId_tradespersonId: { jobId: lead.jobId, tradespersonId },
            },
            create: {
              jobId: lead.jobId,
              tradespersonId,
              message: dto.message,
              amountPence: dto.quoteAmountPence ?? null,
              estimateRange: dto.estimateRange ?? null,
            },
            update: {
              message: dto.message,
              amountPence: dto.quoteAmountPence ?? null,
              estimateRange: dto.estimateRange ?? null,
              status: 'PENDING',
            },
          });
        }
        const account = await tx.leadCredit.findUniqueOrThrow({
          where: { userId: tradespersonId },
        });
        return { lead, account };
      },
      { isolationLevel: 'Serializable' },
    );

    const trade = await this.prisma.user.findUnique({
      where: { id: tradespersonId },
      select: {
        name: true,
        tradespersonProfile: { select: { companyName: true } },
      },
    });
    const who =
      trade?.tradespersonProfile?.companyName ||
      trade?.name ||
      'A tradesperson';
    void this.notifications.notify({
      userId: result.lead.job.homeownerId,
      type: 'NEW_INTEREST',
      title: `${who} is interested in "${result.lead.job.title}"`,
      linkUrl: `/homeowner/my-jobs/${result.lead.jobId}`,
      email: {
        subject: `${who} is interested in your job`,
        paragraphs: [
          `${who} has expressed interest in "${result.lead.job.title}".`,
          'Review their profile and reviews, then shortlist them to exchange contact details — or decline if they are not right for the job.',
        ],
        ctaLabel: 'View your job',
      },
    });

    return {
      leadStatus: 'INTERESTED',
      creditsReserved: result.lead.creditCost,
      balance: result.account.balance,
      reserved: result.account.reserved,
    };
  }

  async withdraw(leadId: string, tradespersonId: string) {
    const lead = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
        include: { job: true },
      });
      if (!lead || lead.tradespersonId !== tradespersonId)
        throw new NotFoundException('Lead not found');
      if (lead.status !== 'INTERESTED') {
        throw new BadRequestException(
          'You can only withdraw before the customer shortlists you',
        );
      }
      await this.credits.release(
        tx,
        tradespersonId,
        lead.id,
        lead.creditsReserved,
        'Interest withdrawn',
      );
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'WITHDRAWN',
          withdrawnAt: new Date(),
          creditsReserved: 0,
        },
      });
      await tx.quote.updateMany({
        where: { jobId: lead.jobId, tradespersonId, status: 'PENDING' },
        data: { status: 'WITHDRAWN' },
      });
      return lead;
    });
    return {
      leadId: lead.id,
      status: 'WITHDRAWN',
      released: lead.creditsReserved,
    };
  }

  async dismiss(leadId: string, tradespersonId: string) {
    const lead = await this.getOwnLead(leadId, tradespersonId);
    if (lead.status !== 'AVAILABLE')
      throw new BadRequestException('Only new leads can be dismissed');
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { dismissedAt: new Date() },
    });
    return { leadId: lead.id, dismissed: true };
  }

  async upsertQuote(leadId: string, tradespersonId: string, dto: QuoteDto) {
    const lead = await this.getOwnLead(leadId, tradespersonId);
    if (lead.status !== 'INTERESTED' && lead.status !== 'SHORTLISTED') {
      throw new BadRequestException(
        'You can only quote on jobs you are still in the running for',
      );
    }
    if (lead.job.status !== 'ACTIVE')
      throw new BadRequestException('This job is no longer open');
    const quote = await this.prisma.quote.upsert({
      where: { jobId_tradespersonId: { jobId: lead.jobId, tradespersonId } },
      create: {
        jobId: lead.jobId,
        tradespersonId,
        message: dto.message,
        amountPence: dto.amountPence ?? null,
        estimateRange: dto.estimateRange ?? null,
      },
      update: {
        message: dto.message,
        amountPence: dto.amountPence ?? null,
        estimateRange: dto.estimateRange ?? null,
        status: 'PENDING',
      },
    });
    void this.notifications.notify({
      userId: lead.job.homeownerId,
      type: 'NEW_QUOTE',
      title: `New quote for "${lead.job.title}"`,
      linkUrl: `/homeowner/my-jobs/${lead.jobId}`,
      email: {
        subject: `You have a new quote for ${lead.job.title}`,
        paragraphs: [
          'A tradesperson has sent you a quote. Compare it with others before you hire.',
        ],
        ctaLabel: 'View quote',
      },
    });
    return { id: quote.id, status: quote.status };
  }

  async requestReview(leadId: string, tradespersonId: string) {
    const lead = await this.getOwnLead(leadId, tradespersonId);
    if (lead.status !== 'HIRED')
      throw new BadRequestException(
        'You can request a review once you have been hired',
      );
    const existing = await this.prisma.review.findFirst({
      where: { jobId: lead.jobId, subjectId: tradespersonId },
    });
    if (existing)
      throw new ConflictException('The customer has already reviewed this job');
    if (
      lead.reviewRequestedAt &&
      Date.now() - lead.reviewRequestedAt.getTime() <
        REVIEW_REQUEST_COOLDOWN_DAYS * DAY_MS
    ) {
      throw new BadRequestException(
        `You can send another reminder ${REVIEW_REQUEST_COOLDOWN_DAYS} days after the last one`,
      );
    }
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { reviewRequestedAt: new Date() },
    });

    const trade = await this.prisma.user.findUnique({
      where: { id: tradespersonId },
      select: {
        name: true,
        tradespersonProfile: { select: { companyName: true } },
      },
    });
    const who =
      trade?.tradespersonProfile?.companyName ||
      trade?.name ||
      'Your tradesperson';
    void this.notifications.notify({
      userId: lead.job.homeownerId,
      type: 'REVIEW_REQUESTED',
      title: `${who} would appreciate a review for "${lead.job.title}"`,
      linkUrl: `/homeowner/my-jobs/${lead.jobId}`,
      email: {
        subject: `How did ${who} do?`,
        paragraphs: [
          `${who} has asked you to review the work on "${lead.job.title}".`,
          'Reviews help other homeowners choose with confidence and reward good work.',
        ],
        ctaLabel: 'Leave a review',
      },
    });
    return { requested: true };
  }

  /** MyBuilder-style lead-fee credit request, reviewed by an admin. */
  async requestCredit(
    leadId: string,
    tradespersonId: string,
    reason: CreditRequestReason,
    details: string,
  ) {
    const lead = await this.getOwnLead(leadId, tradespersonId);
    if (!lead.shortlistedAt || lead.creditsCharged <= 0) {
      throw new BadRequestException(
        'Credit requests are only for lead fees you were charged',
      );
    }
    if (lead.creditRequest)
      throw new ConflictException(
        'You have already requested a credit for this lead',
      );
    const days = (Date.now() - lead.shortlistedAt.getTime()) / DAY_MS;
    if (days > CREDIT_REQUEST_MAX_DAYS) {
      throw new BadRequestException(
        `Credit requests must be made within ${CREDIT_REQUEST_MAX_DAYS} days of being shortlisted`,
      );
    }
    if (reason === 'CUSTOMER_UNREACHABLE' && days < UNREACHABLE_MIN_DAYS) {
      throw new BadRequestException(
        `Please give the customer at least ${UNREACHABLE_MIN_DAYS} days to reply before requesting a credit`,
      );
    }
    if (reason === 'CUSTOMER_UNREACHABLE') {
      const sent = await this.prisma.message.count({
        where: {
          senderId: tradespersonId,
          conversation: { jobId: lead.jobId, tradespersonId },
        },
      });
      if (sent === 0) {
        throw new BadRequestException(
          'Send the customer at least one message through The Builder Network before requesting a credit',
        );
      }
    }
    const req = await this.prisma.creditRequest.create({
      data: {
        leadId: lead.id,
        tradespersonId,
        reason,
        details,
        credits: lead.creditsCharged,
      },
    });
    return { id: req.id, status: req.status };
  }
}
