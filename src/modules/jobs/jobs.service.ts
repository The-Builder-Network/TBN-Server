import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { PostcodeService } from '../../common/postcode.service.js';
import { haversineMiles } from '../../common/geo.js';
import {
  NotificationsService,
  type NotifyInput,
} from '../notifications/notifications.service.js';
import type { CreateJobDto } from './dto/create-job.dto.js';
import type { GetJobsQueryDto } from './dto/get-jobs-query.dto.js';

export const JOB_LISTING_DAYS = 30;
export const LEAD_RESPONSE_DAYS = 7;
export const SHORTLIST_CAP = 5;
export const INVITE_CAP = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Trades whose verification is in these states never receive leads. */
const BLOCKED_VERIFICATION = ['REJECTED', 'SUSPENDED'] as const;

/** Accept either the public job number ("123") or the internal id. */
export function jobWhere(idOrNumber: string): Prisma.JobWhereUniqueInput {
  return /^\d+$/.test(idOrNumber)
    ? { jobNumber: Number(idOrNumber) }
    : { id: idOrNumber };
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly postcode: PostcodeService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async createJob(
    homeownerId: string,
    dto: CreateJobDto,
    files: Express.Multer.File[],
  ) {
    const service = await this.prisma.service.findUnique({
      where: { slug: dto.serviceSlug },
    });
    if (!service) throw new BadRequestException('Unknown service');

    const geo = await this.postcode.geocode(dto.postcode);

    const invitee = dto.inviteUsername
      ? await this.findInvitableTrade(dto.inviteUsername)
      : null;

    // Upload first; if anything after this fails, delete what was uploaded.
    const uploaded: {
      fileUrl: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }[] = [];
    try {
      for (const f of files) {
        const fileUrl = await this.uploads.uploadFile(
          f.buffer,
          f.originalname,
          f.mimetype,
          'job-attachments',
        );
        uploaded.push({
          fileUrl,
          fileName: f.originalname.slice(0, 200),
          fileSize: f.size,
          mimeType: f.mimetype,
        });
      }

      const now = Date.now();
      const { job, leads } = await this.prisma.$transaction(async (tx) => {
        const job = await tx.job.create({
          data: {
            homeownerId,
            title: dto.title,
            description: dto.description,
            serviceSlug: dto.serviceSlug,
            tradeSlug: dto.tradeSlug,
            postcode: geo.postcode,
            postcodeDistrict: geo.district,
            placeName: geo.placeName,
            latitude: geo.latitude,
            longitude: geo.longitude,
            answersJson: (dto.answers ??
              []) as unknown as Prisma.InputJsonValue,
            leadFeeCredits: service.leadFeeCredits,
            expiresAt: new Date(now + JOB_LISTING_DAYS * DAY_MS),
            attachments: { create: uploaded },
          },
        });
        const leads = await this.createMatchedLeads(tx, job, invitee?.userId);
        return { job, leads };
      });

      void this.notifyNewLeads(job, leads);

      return {
        id: job.id,
        jobNumber: job.jobNumber,
        status: job.status,
        matchedCount: leads.length,
        createdAt: job.createdAt,
      };
    } catch (err) {
      await Promise.all(
        uploaded.map((u) => this.uploads.deleteFile(u.fileUrl)),
      );
      throw err;
    }
  }

  /**
   * Create AVAILABLE leads for every nearby trade offering the service.
   * Pending trades get leads too (they can preview), but only approved trades
   * can act on them. Invited trades get a lead regardless of distance.
   */
  private async createMatchedLeads(
    tx: Prisma.TransactionClient,
    job: {
      id: string;
      serviceSlug: string;
      latitude: number | null;
      longitude: number | null;
      leadFeeCredits: number;
    },
    invitedUserId?: string,
  ) {
    if (job.latitude === null || job.longitude === null) return [];
    const candidates = await tx.tradespersonProfile.findMany({
      where: {
        verificationStatus: { notIn: [...BLOCKED_VERIFICATION] },
        user: { accountStatus: 'ACTIVE' },
        latitude: { not: null },
        longitude: { not: null },
        services: { some: { serviceSlug: job.serviceSlug } },
      },
      select: {
        userId: true,
        latitude: true,
        longitude: true,
        workRadiusMiles: true,
      },
    });

    const expiresAt = new Date(Date.now() + LEAD_RESPONSE_DAYS * DAY_MS);
    const rows = new Map<string, Prisma.LeadCreateManyInput>();
    for (const tp of candidates) {
      const dist = haversineMiles(
        job.latitude,
        job.longitude,
        tp.latitude!,
        tp.longitude!,
      );
      if (dist <= tp.workRadiusMiles) {
        rows.set(tp.userId, {
          jobId: job.id,
          tradespersonId: tp.userId,
          creditCost: job.leadFeeCredits,
          distanceMiles: Math.round(dist * 10) / 10,
          expiresAt,
        });
      }
    }
    if (invitedUserId) {
      const existing = rows.get(invitedUserId);
      rows.set(invitedUserId, {
        jobId: job.id,
        tradespersonId: invitedUserId,
        creditCost: job.leadFeeCredits,
        distanceMiles: existing?.distanceMiles ?? null,
        expiresAt,
        invited: true,
        invitedAt: new Date(),
      });
    }
    if (rows.size === 0) return [];
    await tx.lead.createMany({
      data: [...rows.values()],
      skipDuplicates: true,
    });
    return tx.lead.findMany({
      where: { jobId: job.id },
      select: { id: true, tradespersonId: true, invited: true },
    });
  }

  private async notifyNewLeads(
    job: {
      id: string;
      title: string;
      placeName: string | null;
      serviceSlug: string;
    },
    leads: { id: string; tradespersonId: string; invited: boolean }[],
  ) {
    if (leads.length === 0) return;
    const approved = new Set(
      (
        await this.prisma.tradespersonProfile.findMany({
          where: {
            userId: { in: leads.map((l) => l.tradespersonId) },
            verificationStatus: 'APPROVED',
          },
          select: { userId: true },
        })
      ).map((p) => p.userId),
    );
    const where = job.placeName ? ` in ${job.placeName}` : '';
    await this.notifications.notifyMany(
      leads.map<NotifyInput>((l) => ({
        userId: l.tradespersonId,
        type: l.invited ? 'JOB_INVITE' : 'NEW_LEAD',
        title: l.invited
          ? `You've been invited to quote: ${job.title}`
          : `New lead${where}: ${job.title}`,
        linkUrl: `/tradesperson/my-leads/${l.id}`,
        // Email only trades who can actually respond.
        email: approved.has(l.tradespersonId)
          ? {
              subject: l.invited
                ? `A homeowner invited you to quote${where}`
                : `New ${job.title} lead${where}`,
              paragraphs: [
                l.invited
                  ? 'A homeowner has invited you to quote for their job. Expressing interest is free — you only pay the lead fee if they shortlist you.'
                  : 'A homeowner near you has posted a job that matches your services. Expressing interest is free — you only pay the lead fee if they shortlist you.',
              ],
              ctaLabel: 'View lead',
            }
          : undefined,
      })),
    );
  }

  // ── Invite (homeowner "Request a quote") ─────────────────────────────────

  private async findInvitableTrade(username: string) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { username: username.replace(/^@/, '') },
      select: {
        userId: true,
        verificationStatus: true,
        user: { select: { accountStatus: true } },
      },
    });
    if (!profile || profile.user.accountStatus !== 'ACTIVE') {
      throw new NotFoundException('Tradesperson not found');
    }
    if (profile.verificationStatus !== 'APPROVED') {
      throw new BadRequestException(
        'This tradesperson is not accepting quote requests yet',
      );
    }
    return profile;
  }

  async inviteTradesperson(
    idOrNumber: string,
    homeownerId: string,
    username: string,
  ) {
    const job = await this.getOwnedJob(idOrNumber, homeownerId);
    if (job.status !== 'ACTIVE')
      throw new BadRequestException(
        'You can only invite tradespeople to open jobs',
      );
    const trade = await this.findInvitableTrade(username);

    const invitedCount = await this.prisma.lead.count({
      where: { jobId: job.id, invited: true },
    });
    if (invitedCount >= INVITE_CAP) {
      throw new BadRequestException(
        `You can invite up to ${INVITE_CAP} tradespeople per job`,
      );
    }

    const existing = await this.prisma.lead.findUnique({
      where: {
        jobId_tradespersonId: { jobId: job.id, tradespersonId: trade.userId },
      },
    });
    if (existing?.invited) return { leadId: existing.id, alreadyInvited: true };
    if (
      existing &&
      existing.status !== 'AVAILABLE' &&
      existing.status !== 'EXPIRED'
    ) {
      return {
        leadId: existing.id,
        alreadyInvited: false,
        alreadyResponded: true,
      };
    }

    const expiresAt = new Date(Date.now() + LEAD_RESPONSE_DAYS * DAY_MS);
    const lead = await this.prisma.lead.upsert({
      where: {
        jobId_tradespersonId: { jobId: job.id, tradespersonId: trade.userId },
      },
      create: {
        jobId: job.id,
        tradespersonId: trade.userId,
        creditCost: job.leadFeeCredits,
        invited: true,
        invitedAt: new Date(),
        expiresAt,
      },
      update: {
        invited: true,
        invitedAt: new Date(),
        status: 'AVAILABLE',
        dismissedAt: null,
        expiresAt,
      },
    });
    void this.notifyNewLeads(job, [
      { id: lead.id, tradespersonId: trade.userId, invited: true },
    ]);
    return { leadId: lead.id, alreadyInvited: false };
  }

  // ── Backfill leads when a trade changes services / work area ─────────────

  async backfillLeadsForTradesperson(tradespersonId: string): Promise<number> {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId: tradespersonId },
      select: {
        latitude: true,
        longitude: true,
        workRadiusMiles: true,
        verificationStatus: true,
        services: { select: { serviceSlug: true } },
        user: { select: { accountStatus: true } },
      },
    });
    if (
      !profile ||
      profile.latitude === null ||
      profile.longitude === null ||
      (BLOCKED_VERIFICATION as readonly string[]).includes(
        profile.verificationStatus,
      ) ||
      profile.user.accountStatus !== 'ACTIVE' ||
      profile.services.length === 0
    ) {
      return 0;
    }

    const activeJobs = await this.prisma.job.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
        serviceSlug: { in: profile.services.map((s) => s.serviceSlug) },
        homeownerId: { not: tradespersonId },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        leadFeeCredits: true,
      },
    });

    const expiresAt = new Date(Date.now() + LEAD_RESPONSE_DAYS * DAY_MS);
    const data: Prisma.LeadCreateManyInput[] = [];
    for (const job of activeJobs) {
      const dist = haversineMiles(
        job.latitude!,
        job.longitude!,
        profile.latitude,
        profile.longitude,
      );
      if (dist <= profile.workRadiusMiles) {
        data.push({
          jobId: job.id,
          tradespersonId,
          creditCost: job.leadFeeCredits,
          distanceMiles: Math.round(dist * 10) / 10,
          expiresAt,
        });
      }
    }
    if (data.length === 0) return 0;
    const { count } = await this.prisma.lead.createMany({
      data,
      skipDuplicates: true,
    });
    return count;
  }

  // ── Homeowner: list & detail ──────────────────────────────────────────────

  async getJobs(homeownerId: string, query: GetJobsQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const where: Prisma.JobWhereInput = {
      homeownerId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.view === 'open' ? { status: { in: ['ACTIVE', 'HIRED'] } } : {}),
      ...(query.view === 'closed'
        ? { status: { in: ['COMPLETED', 'CLOSED', 'EXPIRED'] } }
        : {}),
    };

    const [total, jobs] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { [query.sort ?? 'createdAt']: query.order ?? 'desc' },
        select: {
          id: true,
          jobNumber: true,
          title: true,
          status: true,
          serviceSlug: true,
          postcode: true,
          placeName: true,
          createdAt: true,
          leads: { select: { status: true } },
        },
      }),
    ]);

    return {
      data: jobs.map((j) => ({
        id: j.id,
        jobNumber: j.jobNumber,
        title: j.title,
        status: j.status,
        serviceSlug: j.serviceSlug,
        postcode: j.postcode,
        placeName: j.placeName,
        interestedCount: j.leads.filter((l) => l.status === 'INTERESTED')
          .length,
        shortlistedCount: j.leads.filter(
          (l) => l.status === 'SHORTLISTED' || l.status === 'HIRED',
        ).length,
        createdAt: j.createdAt,
      })),
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  async getOwnedJob(idOrNumber: string, homeownerId: string) {
    const job = await this.prisma.job.findUnique({
      where: jobWhere(idOrNumber),
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.homeownerId !== homeownerId)
      throw new ForbiddenException('Not your job');
    return job;
  }

  /** Full job view for the homeowner who posted it. */
  async getJobForHomeowner(idOrNumber: string, homeownerId: string) {
    const base = await this.getOwnedJob(idOrNumber, homeownerId);
    const job = await this.prisma.job.findUniqueOrThrow({
      where: { id: base.id },
      include: {
        attachments: { orderBy: { createdAt: 'asc' } },
        quotes: true,
        conversations: { select: { id: true, tradespersonId: true } },
        reviews: { include: { reply: true } },
        leads: {
          where: {
            OR: [
              { status: { notIn: ['AVAILABLE', 'EXPIRED'] } },
              { invited: true },
              { interestedAt: { not: null } },
            ],
          },
          orderBy: [
            { shortlistedAt: 'desc' },
            { interestedAt: 'desc' },
            { invitedAt: 'desc' },
          ],
          include: {
            tradesperson: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatarUrl: true,
                tradespersonProfile: {
                  select: {
                    username: true,
                    companyName: true,
                    avgRating: true,
                    reviewCount: true,
                    verificationStatus: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const review = job.reviews[0];
    return {
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      description: job.description,
      serviceSlug: job.serviceSlug,
      tradeSlug: job.tradeSlug,
      postcode: job.postcode,
      placeName: job.placeName,
      status: job.status,
      answers: Array.isArray(job.answersJson) ? job.answersJson : [],
      createdAt: job.createdAt,
      expiresAt: job.expiresAt,
      hiredAt: job.hiredAt,
      completedAt: job.completedAt,
      closedAt: job.closedAt,
      closeReason: job.closeReason,
      hiredTradespersonId: job.hiredTradespersonId,
      shortlistCap: SHORTLIST_CAP,
      inviteCap: INVITE_CAP,
      attachments: job.attachments.map((a) => ({
        id: a.id,
        fileUrl: a.fileUrl,
        fileName: a.fileName,
        mimeType: a.mimeType,
      })),
      review: review
        ? {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            subjectId: review.subjectId,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
            reply: review.reply
              ? { body: review.reply.body, createdAt: review.reply.createdAt }
              : null,
          }
        : null,
      responses: job.leads.map((lead) => {
        const tp = lead.tradesperson;
        const profile = tp.tradespersonProfile;
        const contactShared = !!lead.shortlistedAt;
        const quote = job.quotes.find(
          (q) => q.tradespersonId === lead.tradespersonId,
        );
        return {
          leadId: lead.id,
          leadStatus: lead.status,
          invited: lead.invited,
          interestMessage: lead.interestMessage,
          interestedAt: lead.interestedAt,
          shortlistedAt: lead.shortlistedAt,
          hiredAt: lead.hiredAt,
          conversationId:
            job.conversations.find(
              (c) => c.tradespersonId === lead.tradespersonId,
            )?.id ?? null,
          tradesperson: {
            id: tp.id,
            name: tp.name,
            avatarUrl: tp.avatarUrl,
            username: profile?.username,
            companyName: profile?.companyName,
            avgRating: profile?.avgRating ?? 0,
            reviewCount: profile?.reviewCount ?? 0,
            verified: profile?.verificationStatus === 'APPROVED',
            // Contact details are only exchanged once shortlisted (MyBuilder rule).
            phone: contactShared ? tp.phone : null,
            email: contactShared ? tp.email : null,
          },
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
        };
      }),
    };
  }

  // ── Homeowner: edit description & photos ─────────────────────────────────

  async updateDescription(
    idOrNumber: string,
    homeownerId: string,
    description: string,
  ) {
    const job = await this.getOwnedJob(idOrNumber, homeownerId);
    if (job.status !== 'ACTIVE')
      throw new BadRequestException('Only open jobs can be edited');
    await this.prisma.job.update({
      where: { id: job.id },
      data: { description },
    });
    return { id: job.id, description };
  }

  async addAttachments(
    idOrNumber: string,
    homeownerId: string,
    files: Express.Multer.File[],
  ) {
    const job = await this.getOwnedJob(idOrNumber, homeownerId);
    if (job.status !== 'ACTIVE')
      throw new BadRequestException('Only open jobs can be edited');
    const count = await this.prisma.jobAttachment.count({
      where: { jobId: job.id },
    });
    if (count + files.length > 10)
      throw new BadRequestException('A job can have at most 10 files');

    const created: {
      id: string;
      fileUrl: string;
      fileName: string;
      mimeType: string;
    }[] = [];
    for (const f of files) {
      const fileUrl = await this.uploads.uploadFile(
        f.buffer,
        f.originalname,
        f.mimetype,
        'job-attachments',
      );
      created.push(
        await this.prisma.jobAttachment.create({
          data: {
            jobId: job.id,
            fileUrl,
            fileName: f.originalname.slice(0, 200),
            fileSize: f.size,
            mimeType: f.mimetype,
          },
        }),
      );
    }
    return created.map((a) => ({
      id: a.id,
      fileUrl: a.fileUrl,
      fileName: a.fileName,
      mimeType: a.mimeType,
    }));
  }

  async removeAttachment(
    idOrNumber: string,
    homeownerId: string,
    attachmentId: string,
  ) {
    const job = await this.getOwnedJob(idOrNumber, homeownerId);
    const att = await this.prisma.jobAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!att || att.jobId !== job.id)
      throw new NotFoundException('File not found');
    await this.prisma.jobAttachment.delete({ where: { id: att.id } });
    await this.uploads.deleteFile(att.fileUrl);
  }
}
