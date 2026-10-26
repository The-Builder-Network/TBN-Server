import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import { MailService } from '../../common/mail.service.js';
import type { AdminPageQueryDto } from './dto/admin.dto.js';

type Db = Prisma.TransactionClient | PrismaService;

const VERIFICATION_STATUSES = [
  'NOT_SUBMITTED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'INFO_REQUESTED',
  'SUSPENDED',
] as const;
type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

function page(q: AdminPageQueryDto) {
  const p = q.page ?? 1;
  const perPage = q.perPage ?? 25;
  return { skip: (p - 1) * perPage, take: perPage, page: p, perPage };
}

function meta(total: number, p: { page: number; perPage: number }) {
  return {
    total,
    page: p.page,
    perPage: p.perPage,
    totalPages: Math.ceil(total / p.perPage),
  };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly notifications: NotificationsService,
    private readonly uploads: UploadsService,
    private readonly jobs: JobsService,
    private readonly reviews: ReviewsService,
    private readonly mail: MailService,
  ) {}

  private audit(
    db: Db,
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    details?: Prisma.InputJsonValue,
  ) {
    return db.adminAuditLog.create({
      data: { adminId, action, targetType, targetId, details },
    });
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getStats() {
    const [
      pendingVerifications,
      infoRequested,
      approvedTrades,
      homeowners,
      tradespeople,
      activeJobs,
      totalJobs,
      pendingCreditRequests,
      revenue,
    ] = await Promise.all([
      this.prisma.tradespersonProfile.count({
        where: { verificationStatus: 'PENDING' },
      }),
      this.prisma.tradespersonProfile.count({
        where: { verificationStatus: 'INFO_REQUESTED' },
      }),
      this.prisma.tradespersonProfile.count({
        where: { verificationStatus: 'APPROVED' },
      }),
      this.prisma.user.count({
        where: { role: 'HOMEOWNER', accountStatus: { not: 'DELETED' } },
      }),
      this.prisma.user.count({
        where: { role: 'TRADESPERSON', accountStatus: { not: 'DELETED' } },
      }),
      this.prisma.job.count({ where: { status: 'ACTIVE' } }),
      this.prisma.job.count(),
      this.prisma.creditRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amountPence: true },
      }),
    ]);
    return {
      pendingVerifications,
      infoRequested,
      approvedTrades,
      homeowners,
      tradespeople,
      activeJobs,
      totalJobs,
      pendingCreditRequests,
      revenuePence: revenue._sum.amountPence ?? 0,
    };
  }

  // ── Verification ──────────────────────────────────────────────────────────

  async listVerifications(q: AdminPageQueryDto) {
    const status = (q.status ?? 'PENDING') as VerificationStatus;
    if (!VERIFICATION_STATUSES.includes(status)) {
      throw new BadRequestException(`Unknown status: ${q.status}`);
    }
    const p = page(q);
    const where: Prisma.TradespersonProfileWhereInput = {
      verificationStatus: status,
      user: { accountStatus: { not: 'DELETED' } },
      ...(q.q
        ? {
            OR: [
              { username: { contains: q.q, mode: 'insensitive' } },
              { companyName: { contains: q.q, mode: 'insensitive' } },
              { user: { name: { contains: q.q, mode: 'insensitive' } } },
              { user: { email: { contains: q.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.tradespersonProfile.count({ where }),
      this.prisma.tradespersonProfile.findMany({
        where,
        // Oldest submissions first: a fair queue.
        orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
        skip: p.skip,
        take: p.take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
          services: { select: { serviceSlug: true, tradeSlug: true } },
        },
      }),
    ]);
    return {
      data: rows.map((r) => ({
        userId: r.userId,
        name: r.user.name,
        email: r.user.email,
        phone: r.user.phone,
        avatarUrl: r.user.avatarUrl,
        username: r.username,
        companyName: r.companyName,
        trade: r.trade,
        postcode: r.postcode,
        services: r.services.map((s) => s.serviceSlug),
        hasIdDocument: !!(r.idDocumentKey || r.idDocumentUrl),
        verificationStatus: r.verificationStatus,
        verificationNote: r.verificationNote,
        submittedAt: r.submittedAt,
        reviewedAt: r.reviewedAt,
        joinedAt: r.user.createdAt,
      })),
      meta: meta(total, p),
    };
  }

  async getTradesperson(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        emailVerified: true,
        accountStatus: true,
        suspensionReason: true,
        createdAt: true,
        lastLoginAt: true,
        tradespersonProfile: {
          include: {
            services: true,
            qualifications: true,
            documents: true,
            portfolioItems: { orderBy: { sortOrder: 'asc' }, take: 12 },
            reviewedBy: { select: { name: true } },
          },
        },
      },
    });
    if (!user?.tradespersonProfile) {
      throw new NotFoundException('Tradesperson not found');
    }
    const profile = user.tradespersonProfile;

    const [account, leadCounts, auditLog, serviceNames] = await Promise.all([
      this.credits.getAccount(userId),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { tradespersonId: userId },
        _count: true,
      }),
      this.prisma.adminAuditLog.findMany({
        where: { targetId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { admin: { select: { name: true } } },
      }),
      this.prisma.service.findMany({
        where: { slug: { in: profile.services.map((s) => s.serviceSlug) } },
        select: { slug: true, name: true },
      }),
    ]);

    let idDocumentUrl: string | null = profile.idDocumentUrl;
    if (profile.idDocumentKey) {
      idDocumentUrl = await this.uploads
        .presignedUrl(profile.idDocumentKey)
        .catch((err: Error) => {
          this.logger.warn(`Presign failed for ${userId}: ${err.message}`);
          return null;
        });
    }

    const nameOf = new Map(serviceNames.map((s) => [s.slug, s.name]));
    const { reviewedBy, ...rest } = profile;
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        accountStatus: user.accountStatus,
        suspensionReason: user.suspensionReason,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      profile: {
        ...rest,
        idDocumentKey: undefined, // private S3 key: never sent to the client
        services: profile.services.map((s) => ({
          serviceSlug: s.serviceSlug,
          serviceName: nameOf.get(s.serviceSlug) ?? s.serviceSlug,
          tradeSlug: s.tradeSlug || null,
        })),
        reviewedByName: reviewedBy?.name ?? null,
        idDocumentUrl,
        idDocumentUrlExpiresInSeconds: profile.idDocumentKey ? 300 : null,
      },
      credits: account,
      leads: Object.fromEntries(leadCounts.map((l) => [l.status, l._count])),
      auditLog: auditLog.map((a) => ({
        id: a.id,
        action: a.action,
        details: a.details,
        adminName: a.admin.name,
        createdAt: a.createdAt,
      })),
    };
  }

  private async setVerification(
    adminId: string,
    userId: string,
    status: 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED',
    note: string | null,
  ) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
      select: {
        verificationStatus: true,
        user: { select: { accountStatus: true } },
      },
    });
    if (!profile) throw new NotFoundException('Tradesperson not found');
    if (profile.user.accountStatus === 'DELETED') {
      throw new BadRequestException('This account has been deleted');
    }
    if (profile.verificationStatus === status && status === 'APPROVED') {
      throw new ConflictException('Already approved');
    }
    if (profile.verificationStatus === 'SUSPENDED') {
      throw new BadRequestException(
        'Reinstate the account before changing its verification',
      );
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.tradespersonProfile.update({
        where: { userId },
        data: {
          verificationStatus: status,
          verificationNote: note,
          reviewedAt: now,
          reviewedById: adminId,
          ...(status === 'APPROVED' ? { verifiedAt: now } : {}),
        },
      });
      await this.audit(
        tx,
        adminId,
        `verification.${status.toLowerCase()}`,
        'USER',
        userId,
        {
          from: profile.verificationStatus,
          note,
        },
      );
    });
  }

  async approve(adminId: string, userId: string, note?: string) {
    await this.setVerification(adminId, userId, 'APPROVED', null);
    void this.notifications.notify({
      userId,
      type: 'ACCOUNT_VERIFIED',
      title: 'Your profile is verified',
      body: 'You can now express interest in leads and appear in search results.',
      linkUrl: '/tradesperson/leads',
      email: {
        subject: 'You’re verified on The Builder Network',
        heading: 'Your profile has been approved',
        paragraphs: [
          'Good news — our team has reviewed and approved your profile.',
          'You now appear in homeowner searches and can express interest in jobs in your area.',
          ...(note ? [note] : []),
        ],
        ctaLabel: 'View your leads',
      },
    });
    // Fill the lead list now that their profile counts.
    void this.jobs
      .backfillLeadsForTradesperson(userId)
      .catch((err: Error) =>
        this.logger.warn(`Backfill failed for ${userId}: ${err.message}`),
      );
    return this.getTradesperson(userId);
  }

  async reject(adminId: string, userId: string, note: string) {
    await this.setVerification(adminId, userId, 'REJECTED', note);
    void this.notifications.notify({
      userId,
      type: 'VERIFICATION_REJECTED',
      title: 'Your verification was not approved',
      body: note,
      linkUrl: '/tradesperson/profile?tab=verification',
      email: {
        subject: 'Update on your Builder Network verification',
        heading: 'We couldn’t approve your profile yet',
        paragraphs: [
          'Our team reviewed your profile but couldn’t approve it this time. Reason:',
          note,
          'You can update your details and submit again from your profile, or reply to support@thebuildernetwork.com.',
        ],
        ctaLabel: 'Update your profile',
      },
    });
    return this.getTradesperson(userId);
  }

  async requestInfo(adminId: string, userId: string, note: string) {
    await this.setVerification(adminId, userId, 'INFO_REQUESTED', note);
    void this.notifications.notify({
      userId,
      type: 'VERIFICATION_INFO_REQUESTED',
      title: 'We need a bit more information',
      body: note,
      linkUrl: '/tradesperson/profile?tab=verification',
      email: {
        subject: 'More information needed for your verification',
        heading: 'We need a bit more information',
        paragraphs: [
          'To finish verifying your profile, we need the following:',
          note,
          'Update your profile and press “Submit for verification” again.',
        ],
        ctaLabel: 'Update your profile',
      },
    });
    return this.getTradesperson(userId);
  }

  // ── Account status ────────────────────────────────────────────────────────

  async suspend(adminId: string, userId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, accountStatus: true, email: true, name: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN')
      throw new BadRequestException('Admins cannot be suspended here');
    if (user.accountStatus !== 'ACTIVE') {
      throw new ConflictException(
        `Account is ${user.accountStatus.toLowerCase()}`,
      );
    }

    // ponytail: open access tokens stay valid until expiry (≤15 min); suspended trades are
    // blocked from lead actions immediately via verificationStatus. Add a per-request
    // status check in JwtStrategy if instant lock-out is ever needed.
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          accountStatus: 'SUSPENDED',
          suspensionReason: reason,
          tokenVersion: { increment: 1 },
        },
      });
      await tx.tradespersonProfile.updateMany({
        where: { userId },
        data: { verificationStatus: 'SUSPENDED', verificationNote: reason },
      });
      await this.audit(tx, adminId, 'user.suspend', 'USER', userId, { reason });
    });

    // notify() skips non-active accounts, so email directly.
    void this.mail.send({
      to: user.email,
      subject: 'Your Builder Network account has been suspended',
      heading: 'Your account has been suspended',
      paragraphs: [
        `Hi ${user.name.split(' ')[0]},`,
        `Your account has been suspended. Reason: ${reason}`,
        'If you think this is a mistake, contact support@thebuildernetwork.com.',
      ],
    });
    return { userId, accountStatus: 'SUSPENDED' as const };
  }

  async reinstate(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        accountStatus: true,
        tradespersonProfile: { select: { verifiedAt: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'SUSPENDED') {
      throw new ConflictException('Account is not suspended');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { accountStatus: 'ACTIVE', suspensionReason: null },
      });
      // Back to where they were: verified trades stay verified, others re-submit.
      await tx.tradespersonProfile.updateMany({
        where: { userId, verificationStatus: 'SUSPENDED' },
        data: {
          verificationStatus: user.tradespersonProfile?.verifiedAt
            ? 'APPROVED'
            : 'NOT_SUBMITTED',
          verificationNote: null,
        },
      });
      await this.audit(tx, adminId, 'user.reinstate', 'USER', userId);
    });
    return { userId, accountStatus: 'ACTIVE' as const };
  }

  // ── Credits ───────────────────────────────────────────────────────────────

  async listCreditRequests(q: AdminPageQueryDto) {
    const status = q.status ?? 'PENDING';
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      throw new BadRequestException(`Unknown status: ${status}`);
    }
    const p = page(q);
    const where = { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' };
    const [total, rows] = await Promise.all([
      this.prisma.creditRequest.count({ where }),
      this.prisma.creditRequest.findMany({
        where,
        orderBy: { createdAt: status === 'PENDING' ? 'asc' : 'desc' },
        skip: p.skip,
        take: p.take,
        include: {
          tradesperson: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { name: true } },
          lead: {
            select: {
              id: true,
              status: true,
              shortlistedAt: true,
              job: {
                select: {
                  id: true,
                  jobNumber: true,
                  title: true,
                  status: true,
                  homeowner: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        reason: r.reason,
        details: r.details,
        credits: r.credits,
        status: r.status,
        adminNote: r.adminNote,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        reviewedByName: r.reviewedBy?.name ?? null,
        tradesperson: r.tradesperson,
        lead: {
          id: r.lead.id,
          status: r.lead.status,
          shortlistedAt: r.lead.shortlistedAt,
        },
        job: r.lead.job,
      })),
      meta: meta(total, p),
    };
  }

  async resolveCreditRequest(
    adminId: string,
    id: string,
    approve: boolean,
    note?: string,
  ) {
    if (!approve && !note) {
      throw new BadRequestException('A note is required when rejecting');
    }
    const status = approve ? 'APPROVED' : 'REJECTED';
    const req = await this.prisma.$transaction(async (tx) => {
      // Guarded transition so two admins can't both refund the same request.
      const { count } = await tx.creditRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status,
          adminNote: note ?? null,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
      if (count === 0) {
        const exists = await tx.creditRequest.count({ where: { id } });
        if (!exists) throw new NotFoundException('Credit request not found');
        throw new ConflictException('This request has already been resolved');
      }
      const r = await tx.creditRequest.findUniqueOrThrow({ where: { id } });
      if (approve) {
        await this.credits.grant(
          tx,
          r.tradespersonId,
          r.credits,
          'ADMIN_CREDIT',
          {
            creditRequestId: r.id,
            leadId: r.leadId,
            adminId,
            note: 'Lead credit request approved',
          },
        );
      }
      await this.audit(
        tx,
        adminId,
        `credit_request.${status.toLowerCase()}`,
        'CREDIT_REQUEST',
        id,
        {
          tradespersonId: r.tradespersonId,
          credits: r.credits,
          note: note ?? null,
        },
      );
      return r;
    });

    void this.notifications.notify({
      userId: req.tradespersonId,
      type: 'CREDIT_REQUEST_RESOLVED',
      title: approve
        ? `${req.credits} credits returned to your balance`
        : 'Your credit request was not approved',
      body: note,
      linkUrl: '/tradesperson/profile?tab=balance',
    });
    return { id, status };
  }

  async adjustCredits(
    adminId: string,
    userId: string,
    amount: number,
    note: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'TRADESPERSON') {
      throw new BadRequestException('Only tradespeople have credit balances');
    }
    await this.prisma.$transaction(async (tx) => {
      const refs = { adminId, note };
      if (amount > 0)
        await this.credits.grant(tx, userId, amount, 'ADMIN_CREDIT', refs);
      else await this.credits.debit(tx, userId, -amount, 'ADMIN_DEBIT', refs);
      await this.audit(tx, adminId, 'credits.adjust', 'USER', userId, {
        amount,
        note,
      });
    });
    if (amount > 0) {
      void this.notifications.notify({
        userId,
        type: 'CREDIT_TOPUP',
        title: `${amount} credits added by The Builder Network`,
        body: note,
        linkUrl: '/tradesperson/profile?tab=balance',
      });
    }
    return this.credits.getAccount(userId);
  }

  getCreditLedger(userId: string, q: AdminPageQueryDto) {
    return this.credits.getHistory(userId, q.page ?? 1, q.perPage ?? 25);
  }

  // ── Services / lead fees ──────────────────────────────────────────────────

  listServices() {
    return this.prisma.service.findMany({
      orderBy: { name: 'asc' },
      select: { slug: true, name: true, leadFeeCredits: true },
    });
  }

  async updateLeadFee(adminId: string, slug: string, leadFeeCredits: number) {
    const svc = await this.prisma.service.findUnique({ where: { slug } });
    if (!svc) throw new NotFoundException('Service not found');
    // Applies to jobs posted from now on; existing jobs keep the fee they were posted with.
    const [updated] = await this.prisma.$transaction([
      this.prisma.service.update({
        where: { slug },
        data: { leadFeeCredits },
        select: { slug: true, name: true, leadFeeCredits: true },
      }),
      this.prisma.adminAuditLog.create({
        data: {
          adminId,
          action: 'service.lead_fee',
          targetType: 'SERVICE',
          targetId: slug,
          details: { from: svc.leadFeeCredits, to: leadFeeCredits },
        },
      }),
    ]);
    return updated;
  }

  // ── Lists ─────────────────────────────────────────────────────────────────

  async listUsers(q: AdminPageQueryDto) {
    const p = page(q);
    const where: Prisma.UserWhereInput = {
      ...(q.role ? { role: q.role } : {}),
      ...(q.status
        ? { accountStatus: q.status as 'ACTIVE' | 'SUSPENDED' | 'DELETED' }
        : {}),
      ...(q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: 'insensitive' } },
              { email: { contains: q.q, mode: 'insensitive' } },
              { phone: { contains: q.q } },
              {
                tradespersonProfile: {
                  username: { contains: q.q, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          accountStatus: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          leadCredit: { select: { balance: true, reserved: true } },
          tradespersonProfile: {
            select: {
              username: true,
              verificationStatus: true,
              avgRating: true,
              reviewCount: true,
            },
          },
          _count: { select: { jobsPosted: true } },
        },
      }),
    ]);
    return {
      data: rows.map(({ leadCredit, tradespersonProfile, _count, ...u }) => ({
        ...u,
        username: tradespersonProfile?.username ?? null,
        verificationStatus: tradespersonProfile?.verificationStatus ?? null,
        avgRating: tradespersonProfile?.avgRating ?? null,
        reviewCount: tradespersonProfile?.reviewCount ?? null,
        credits: leadCredit,
        jobsPosted: _count.jobsPosted,
      })),
      meta: meta(total, p),
    };
  }

  async listJobs(q: AdminPageQueryDto) {
    const p = page(q);
    const num = q.q && /^\d+$/.test(q.q) ? Number(q.q) : undefined;
    const where: Prisma.JobWhereInput = {
      ...(q.status
        ? {
            status: q.status as
              | 'ACTIVE'
              | 'HIRED'
              | 'COMPLETED'
              | 'CLOSED'
              | 'EXPIRED',
          }
        : {}),
      ...(q.q
        ? {
            OR: [
              { title: { contains: q.q, mode: 'insensitive' } },
              { postcode: { contains: q.q, mode: 'insensitive' } },
              { homeowner: { email: { contains: q.q, mode: 'insensitive' } } },
              ...(num ? [{ jobNumber: num }] : []),
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
        select: {
          id: true,
          jobNumber: true,
          title: true,
          serviceSlug: true,
          postcode: true,
          status: true,
          leadFeeCredits: true,
          createdAt: true,
          hiredAt: true,
          completedAt: true,
          closedAt: true,
          closeReason: true,
          homeowner: { select: { id: true, name: true, email: true } },
          hiredTradesperson: { select: { id: true, name: true } },
          _count: { select: { leads: true } },
        },
      }),
    ]);
    const engaged = await this.prisma.lead.groupBy({
      by: ['jobId'],
      where: {
        jobId: { in: rows.map((r) => r.id) },
        interestedAt: { not: null },
      },
      _count: true,
    });
    const interested = new Map(engaged.map((e) => [e.jobId, e._count]));
    return {
      data: rows.map(({ _count, ...j }) => ({
        ...j,
        leadsSent: _count.leads,
        interested: interested.get(j.id) ?? 0,
      })),
      meta: meta(total, p),
    };
  }

  async listReviews(q: AdminPageQueryDto) {
    const p = page(q);
    const where: Prisma.ReviewWhereInput = {
      ...(q.status === 'hidden' ? { hiddenAt: { not: null } } : {}),
      ...(q.status === 'visible' ? { hiddenAt: null } : {}),
      ...(q.q ? { comment: { contains: q.q, mode: 'insensitive' } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
        select: {
          id: true,
          rating: true,
          comment: true,
          hiddenAt: true,
          hiddenReason: true,
          createdAt: true,
          author: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          job: { select: { id: true, jobNumber: true, title: true } },
        },
      }),
    ]);
    return { data: rows, meta: meta(total, p) };
  }

  async setReviewHidden(
    adminId: string,
    id: string,
    hidden: boolean,
    reason?: string,
  ) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id },
        data: hidden
          ? { hiddenAt: new Date(), hiddenReason: reason ?? null }
          : { hiddenAt: null, hiddenReason: null },
      });
      await this.reviews.recalculateRating(tx, review.subjectId);
      await this.audit(
        tx,
        adminId,
        hidden ? 'review.hide' : 'review.unhide',
        'REVIEW',
        id,
        {
          reason: reason ?? null,
        },
      );
    });
    return { id, hidden };
  }

  async listAuditLog(q: AdminPageQueryDto) {
    const p = page(q);
    const where: Prisma.AdminAuditLogWhereInput = q.q
      ? { OR: [{ targetId: q.q }, { action: { contains: q.q } }] }
      : {};
    const [total, rows] = await Promise.all([
      this.prisma.adminAuditLog.count({ where }),
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
        include: { admin: { select: { name: true, email: true } } },
      }),
    ]);
    return { data: rows, meta: meta(total, p) };
  }
}
