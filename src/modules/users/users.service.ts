import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { PostcodeService } from '../../common/postcode.service.js';
import { postcodeDistrict } from '../../common/geo.js';
import { JobsService } from '../jobs/jobs.service.js';
import { HiringService } from '../jobs/hiring.service.js';
import { CreditsService } from '../credits/credits.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { AddServiceDto } from './dto/add-service.dto.js';
import type { AddQualificationDto } from './dto/add-qualification.dto.js';
import type { CreateMessageTemplateDto } from './dto/create-message-template.dto.js';
import type { UpdateMessageTemplateDto } from './dto/update-message-template.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

const profileInclude = {
  services: true,
  qualifications: true,
  portfolioItems: { orderBy: { sortOrder: 'asc' as const } },
  messageTemplates: { orderBy: { createdAt: 'asc' as const } },
  documents: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.TradespersonProfileInclude;

type FullProfile = Prisma.TradespersonProfileGetPayload<{
  include: typeof profileInclude;
}>;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly postcode: PostcodeService,
    private readonly jobs: JobsService,
    private readonly hiring: HiringService,
    private readonly credits: CreditsService,
  ) {}

  private async getProfileOrThrow(userId: string) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');
    return profile;
  }

  // ── Public profile ────────────────────────────────────────────────────────

  /** Visible to everyone once approved; the owner can always preview their own. */
  async getPublicProfile(username: string, viewerId?: string) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { username: username.replace(/^@/, '') },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
            accountStatus: true,
          },
        },
        services: true,
        qualifications: true,
        portfolioItems: { orderBy: { sortOrder: 'asc' } },
      },
    });
    const isOwner = !!profile && profile.userId === viewerId;
    if (
      !profile ||
      profile.user.accountStatus !== 'ACTIVE' ||
      (profile.verificationStatus !== 'APPROVED' && !isOwner)
    ) {
      throw new NotFoundException('Profile not found');
    }

    const visible = { subjectId: profile.userId, hiddenAt: null };
    const [reviews, allRatings] = await Promise.all([
      this.prisma.review.findMany({
        where: visible,
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          author: {
            select: { name: true, avatarUrl: true, accountStatus: true },
          },
          job: { select: { title: true, placeName: true } },
          reply: { select: { body: true, createdAt: true } },
        },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: visible,
        _count: { rating: true },
      }),
    ]);
    const ratingBreakdown: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    for (const r of allRatings)
      ratingBreakdown[String(r.rating)] = r._count.rating;

    return {
      username: profile.username,
      name: profile.user.name,
      companyName: profile.companyName,
      trade: profile.trade,
      avatarUrl: profile.user.avatarUrl,
      bio: profile.bio,
      // Only the district is public — a sole trader's postcode is often their home.
      location: postcodeDistrict(profile.postcode),
      memberSince: profile.user.createdAt,
      verified: profile.verificationStatus === 'APPROVED',
      isOwnerPreview: isOwner && profile.verificationStatus !== 'APPROVED',
      guarantee: profile.guarantee,
      responseTime: profile.responseTime,
      avgRating: profile.avgRating,
      reviewCount: profile.reviewCount,
      completedJobs: profile.completedJobs,
      badges: this.computeBadges(profile),
      workRadiusMiles: profile.workRadiusMiles,
      services: [...new Set(profile.services.map((s) => s.serviceSlug))],
      qualifications: profile.qualifications.map((q) => ({
        name: q.name,
        verified: q.verified,
      })),
      insurance: {
        publicLiability: profile.publicLiability,
        employersLiability: profile.employersLiability,
        professionalIndemnity: profile.professionalIndemnity,
        verified: profile.insuranceVerified,
        expiresAt: profile.insuranceExpiresAt,
      },
      portfolioItems: profile.portfolioItems.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        title: p.title,
        category: p.category,
      })),
      ratingBreakdown,
      reviews: reviews.map((r) => ({
        id: r.id,
        authorName:
          r.author.accountStatus === 'DELETED'
            ? 'Former customer'
            : r.author.name.split(' ')[0],
        authorAvatar:
          r.author.accountStatus === 'DELETED' ? null : r.author.avatarUrl,
        rating: r.rating,
        comment: r.comment,
        jobTitle: r.job.title,
        location: r.job.placeName,
        createdAt: r.createdAt,
        reply: r.reply
          ? { body: r.reply.body, createdAt: r.reply.createdAt }
          : undefined,
      })),
    };
  }

  // ── Own tradesperson profile ──────────────────────────────────────────────

  private formatOwnProfile(
    profile: FullProfile,
    user: { phone: string | null; email: string } | null,
  ) {
    const checklist = {
      idDocument: !!profile.idDocumentKey,
      services: profile.services.length > 0,
      workArea: profile.latitude !== null && !!profile.postcode,
      phone: !!user?.phone,
    };
    return {
      id: profile.id,
      username: profile.username,
      companyName: profile.companyName,
      bio: profile.bio,
      trade: profile.trade,
      postcode: profile.postcode,
      workRadiusMiles: profile.workRadiusMiles,
      verificationStatus: profile.verificationStatus,
      verification: {
        status: profile.verificationStatus,
        note: profile.verificationNote,
        submittedAt: profile.submittedAt,
        verifiedAt: profile.verifiedAt,
        idDocumentName: profile.idDocumentName,
        idDocumentUploadedAt: profile.idDocumentUploadedAt,
        checklist,
        canSubmit:
          ['NOT_SUBMITTED', 'REJECTED', 'INFO_REQUESTED'].includes(
            profile.verificationStatus,
          ) && Object.values(checklist).every(Boolean),
      },
      guarantee: profile.guarantee,
      responseTime: profile.responseTime,
      avgRating: profile.avgRating,
      reviewCount: profile.reviewCount,
      completedJobs: profile.completedJobs,
      phone: user?.phone ?? null,
      email: user?.email ?? null,
      services: profile.services.map((s) => ({
        id: s.id,
        serviceSlug: s.serviceSlug,
        tradeSlug: s.tradeSlug || undefined,
      })),
      qualifications: profile.qualifications.map((q) => ({
        id: q.id,
        name: q.name,
        verified: q.verified,
        year: q.year,
      })),
      portfolioItems: profile.portfolioItems.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        title: p.title,
        category: p.category,
      })),
      insurance: {
        publicLiability: profile.publicLiability,
        employersLiability: profile.employersLiability,
        professionalIndemnity: profile.professionalIndemnity,
        verified: profile.insuranceVerified,
        expiresAt: profile.insuranceExpiresAt,
      },
      messageTemplates: profile.messageTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        body: t.body,
      })),
      documents: profile.documents.map((d) => ({
        id: d.id,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
        mimeType: d.mimeType,
        createdAt: d.createdAt,
      })),
    };
  }

  async getMyProfile(userId: string) {
    const [profile, user] = await Promise.all([
      this.prisma.tradespersonProfile.findUnique({
        where: { userId },
        include: profileInclude,
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, email: true },
      }),
    ]);
    if (!profile) throw new NotFoundException('Tradesperson profile not found');
    return this.formatOwnProfile(profile, user);
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.getProfileOrThrow(userId);

    let geo:
      | { latitude: number; longitude: number; postcode: string }
      | undefined;
    if (
      dto.postcode &&
      dto.postcode.replace(/\s/g, '').toUpperCase() !==
        (profile.postcode ?? '').replace(/\s/g, '')
    ) {
      geo = await this.postcode.geocode(dto.postcode);
    }

    const updated = await this.prisma.tradespersonProfile.update({
      where: { userId },
      data: {
        companyName: dto.companyName,
        bio: dto.bio,
        trade: dto.trade,
        workRadiusMiles: dto.workRadiusMiles,
        guarantee: dto.guarantee,
        responseTime: dto.responseTime,
        publicLiability: dto.publicLiability,
        employersLiability: dto.employersLiability,
        professionalIndemnity: dto.professionalIndemnity,
        ...(geo
          ? {
              postcode: geo.postcode,
              latitude: geo.latitude,
              longitude: geo.longitude,
            }
          : {}),
      },
      include: profileInclude,
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true },
    });

    if (geo || dto.workRadiusMiles !== undefined) {
      this.jobs
        .backfillLeadsForTradesperson(userId)
        .catch((e: Error) => this.logger.warn(e.message));
    }
    return this.formatOwnProfile(updated, user);
  }

  async refreshLeads(userId: string) {
    const created = await this.jobs.backfillLeadsForTradesperson(userId);
    return { created };
  }

  // ── Verification ──────────────────────────────────────────────────────────

  async uploadIdDocument(userId: string, file: Express.Multer.File) {
    const profile = await this.getProfileOrThrow(userId);
    if (profile.verificationStatus === 'PENDING') {
      throw new BadRequestException(
        'Your profile is being reviewed — you can update documents once the review is complete',
      );
    }
    const key = await this.uploads.uploadPrivate(
      file.buffer,
      file.originalname,
      file.mimetype,
      'id-documents',
    );
    await this.prisma.tradespersonProfile.update({
      where: { userId },
      data: {
        idDocumentKey: key,
        idDocumentUrl: null,
        idDocumentName: file.originalname.slice(0, 200),
        idDocumentUploadedAt: new Date(),
      },
    });
    if (profile.idDocumentKey)
      void this.uploads.deletePrivate(profile.idDocumentKey);
    return {
      message: 'ID document uploaded.',
      idDocumentName: file.originalname,
    };
  }

  /** Send the profile to the admin verification queue. */
  async submitForVerification(userId: string) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
      include: profileInclude,
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true },
    });
    const own = this.formatOwnProfile(profile, user);

    if (profile.verificationStatus === 'PENDING') return own;
    if (profile.verificationStatus === 'APPROVED')
      throw new BadRequestException('Your profile is already verified');
    if (profile.verificationStatus === 'SUSPENDED') {
      throw new ForbiddenException(
        'Your account is suspended. Please contact support@thebuildernetwork.com.',
      );
    }
    const missing = Object.entries(own.verification.checklist)
      .filter(([, ok]) => !ok)
      .map(
        ([k]) =>
          ({
            idDocument: 'an ID document',
            services: 'at least one service',
            workArea: 'your work area',
            phone: 'a phone number',
          })[k],
      );
    if (missing.length)
      throw new BadRequestException(
        `Please add ${missing.join(', ')} before submitting`,
      );

    const updated = await this.prisma.tradespersonProfile.update({
      where: { userId },
      data: { verificationStatus: 'PENDING', submittedAt: new Date() },
      include: profileInclude,
    });
    return this.formatOwnProfile(updated, user);
  }

  // ── Account (both roles) ──────────────────────────────────────────────────

  async updateUser(userId: string, dto: UpdateUserDto) {
    if (dto.phone) {
      const taken = await this.prisma.user.findFirst({
        where: {
          phone: dto.phone,
          id: { not: userId },
          accountStatus: { not: 'DELETED' },
        },
        select: { id: true },
      });
      if (taken)
        throw new ConflictException(
          'That phone number is already used by another account',
        );
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        phone: dto.phone,
        ...(dto.marketingOptIn !== undefined
          ? {
              marketingOptIn: dto.marketingOptIn,
              marketingOptInAt: dto.marketingOptIn ? new Date() : null,
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        phone: true,
        avatarUrl: true,
        emailVerified: true,
        marketingOptIn: true,
        notificationsPaused: true,
        createdAt: true,
      },
    });
  }

  async setNotificationsPaused(userId: string, paused: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationsPaused: paused },
    });
    return { notificationsPaused: paused };
  }

  /**
   * Delete account (MyBuilder: profile, photos and personal data removed).
   * We anonymise rather than hard-delete: a hard delete would cascade into the
   * other party's jobs, conversations and reviews. Open jobs are closed, open
   * interest is withdrawn (reserved credits released), credits are forfeited,
   * and every session is revoked.
   */
  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tradespersonProfile: {
          include: { portfolioItems: true, documents: true },
        },
      },
    });
    if (!user || user.accountStatus === 'DELETED')
      throw new NotFoundException('Account not found');
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new BadRequestException('Your password is incorrect');
    }

    const filesToDelete: string[] = [];
    const privateToDelete: string[] = [];
    if (user.avatarUrl) filesToDelete.push(user.avatarUrl);
    const tp = user.tradespersonProfile;
    if (tp) {
      filesToDelete.push(
        ...tp.portfolioItems.map((p) => p.imageUrl),
        ...tp.documents.map((d) => d.fileUrl),
      );
      if (tp.idDocumentKey) privateToDelete.push(tp.idDocumentKey);
    }

    await this.prisma.$transaction(async (tx) => {
      // Homeowner side: close every open job and release trades' reserved credits.
      const openJobs = await tx.job.findMany({
        where: { homeownerId: userId, status: { in: ['ACTIVE', 'HIRED'] } },
        select: { id: true },
      });
      for (const job of openJobs) {
        await tx.job.update({
          where: { id: job.id },
          data: {
            status: 'CLOSED',
            closedAt: new Date(),
            closeReason: 'Account deleted',
          },
        });
        await this.hiring.closeOpenLeads(
          tx,
          job.id,
          'Customer account deleted',
        );
      }

      // Trade side: withdraw open interest (releasing reserves) and stop matching.
      const interested = await tx.lead.findMany({
        where: { tradespersonId: userId, status: 'INTERESTED' },
      });
      for (const lead of interested) {
        await this.credits.release(
          tx,
          userId,
          lead.id,
          lead.creditsReserved,
          'Account deleted',
        );
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            status: 'WITHDRAWN',
            withdrawnAt: new Date(),
            creditsReserved: 0,
          },
        });
      }
      await tx.lead.updateMany({
        where: { tradespersonId: userId, status: 'AVAILABLE' },
        data: { status: 'NOT_SELECTED', notSelectedAt: new Date() },
      });

      if (tp) {
        await tx.tradespersonService.deleteMany({
          where: { tradespersonProfileId: tp.id },
        });
        await tx.portfolioItem.deleteMany({
          where: { tradespersonProfileId: tp.id },
        });
        await tx.profileDocument.deleteMany({
          where: { tradespersonProfileId: tp.id },
        });
        await tx.qualification.deleteMany({
          where: { tradespersonProfileId: tp.id },
        });
        await tx.messageTemplate.deleteMany({
          where: { tradespersonProfileId: tp.id },
        });
        await tx.tradespersonProfile.update({
          where: { id: tp.id },
          data: {
            username: `deleted-${tp.id}`,
            companyName: null,
            bio: null,
            trade: null,
            postcode: null,
            latitude: null,
            longitude: null,
            idDocumentKey: null,
            idDocumentUrl: null,
            idDocumentName: null,
            publicLiability: null,
            employersLiability: null,
            professionalIndemnity: null,
          },
        });
      }

      const credit = await tx.leadCredit.findUnique({ where: { userId } });
      if (credit && credit.balance > 0) {
        await this.credits.debit(tx, userId, credit.balance, 'ADMIN_DEBIT', {
          note: 'Forfeited on account deletion',
        });
      }

      await tx.notification.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted+${userId}@deleted.thebuildernetwork.com`,
          name: 'Former member',
          username: null,
          phone: null,
          avatarUrl: null,
          passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          passwordResetToken: null,
          emailVerifyToken: null,
          marketingOptIn: false,
          accountStatus: 'DELETED',
          deletedAt: new Date(),
          tokenVersion: { increment: 1 },
        },
      });
    });

    await Promise.all([
      ...filesToDelete.map((u) => this.uploads.deleteFile(u)),
      ...privateToDelete.map((k) => this.uploads.deletePrivate(k)),
    ]);
    return { deleted: true };
  }

  // ── Avatar ────────────────────────────────────────────────────────────────

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    // Upload the new file before deleting the old one, so a failed upload keeps the current avatar.
    const avatarUrl = await this.uploads.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'avatars',
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
    if (existing?.avatarUrl) void this.uploads.deleteFile(existing.avatarUrl);
    return { avatarUrl };
  }

  async deleteAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });
    if (user?.avatarUrl) void this.uploads.deleteFile(user.avatarUrl);
  }

  // ── Services ──────────────────────────────────────────────────────────────

  async addService(userId: string, dto: AddServiceDto) {
    const profile = await this.getProfileOrThrow(userId);
    const service = await this.prisma.service.findUnique({
      where: { slug: dto.serviceSlug },
    });
    if (!service) throw new BadRequestException('Unknown service');
    if (dto.tradeSlug) {
      const trade = await this.prisma.trade.findUnique({
        where: { slug: dto.tradeSlug },
      });
      if (!trade || trade.serviceSlug !== dto.serviceSlug)
        throw new BadRequestException('Unknown trade for this service');
    }

    try {
      const created = await this.prisma.tradespersonService.create({
        data: {
          tradespersonProfileId: profile.id,
          serviceSlug: dto.serviceSlug,
          tradeSlug: dto.tradeSlug ?? '',
        },
      });
      this.jobs
        .backfillLeadsForTradesperson(userId)
        .catch((e: Error) => this.logger.warn(e.message));
      return {
        id: created.id,
        serviceSlug: created.serviceSlug,
        tradeSlug: created.tradeSlug || undefined,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Service already added');
      }
      throw err;
    }
  }

  async removeService(userId: string, serviceId: string) {
    const profile = await this.getProfileOrThrow(userId);
    const service = await this.prisma.tradespersonService.findUnique({
      where: { id: serviceId },
    });
    if (!service || service.tradespersonProfileId !== profile.id)
      throw new NotFoundException('Service not found');
    await this.prisma.tradespersonService.delete({ where: { id: serviceId } });
  }

  // ── Qualifications ────────────────────────────────────────────────────────

  async addQualification(userId: string, dto: AddQualificationDto) {
    const profile = await this.getProfileOrThrow(userId);
    const qual = await this.prisma.qualification.create({
      data: {
        tradespersonProfileId: profile.id,
        name: dto.name,
        year: dto.year,
      },
    });
    return {
      id: qual.id,
      name: qual.name,
      verified: qual.verified,
      year: qual.year,
    };
  }

  async removeQualification(userId: string, qualId: string) {
    const profile = await this.getProfileOrThrow(userId);
    const qual = await this.prisma.qualification.findUnique({
      where: { id: qualId },
    });
    if (!qual || qual.tradespersonProfileId !== profile.id)
      throw new NotFoundException('Qualification not found');
    await this.prisma.qualification.delete({ where: { id: qualId } });
  }

  // ── Portfolio ─────────────────────────────────────────────────────────────

  async uploadPortfolioItem(
    userId: string,
    file: Express.Multer.File,
    title?: string,
    category?: string,
  ) {
    const profile = await this.getProfileOrThrow(userId);
    const count = await this.prisma.portfolioItem.count({
      where: { tradespersonProfileId: profile.id },
    });
    if (count >= 50)
      throw new BadRequestException('You can add up to 50 portfolio photos');
    const imageUrl = await this.uploads.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'portfolio',
    );
    const item = await this.prisma.portfolioItem.create({
      data: {
        tradespersonProfileId: profile.id,
        imageUrl,
        title: title?.slice(0, 120),
        category: category?.slice(0, 100),
        sortOrder: count,
      },
    });
    return {
      id: item.id,
      imageUrl: item.imageUrl,
      title: item.title,
      category: item.category,
    };
  }

  async deletePortfolioItem(userId: string, itemId: string) {
    const profile = await this.getProfileOrThrow(userId);
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.tradespersonProfileId !== profile.id)
      throw new NotFoundException('Portfolio item not found');
    await this.prisma.portfolioItem.delete({ where: { id: itemId } });
    void this.uploads.deleteFile(item.imageUrl);
  }

  // ── Message templates ─────────────────────────────────────────────────────

  async createMessageTemplate(userId: string, dto: CreateMessageTemplateDto) {
    const profile = await this.getProfileOrThrow(userId);
    const t = await this.prisma.messageTemplate.create({
      data: {
        tradespersonProfileId: profile.id,
        name: dto.name,
        body: dto.body,
      },
    });
    return { id: t.id, name: t.name, body: t.body };
  }

  async updateMessageTemplate(
    userId: string,
    templateId: string,
    dto: UpdateMessageTemplateDto,
  ) {
    const profile = await this.getProfileOrThrow(userId);
    const existing = await this.prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });
    if (!existing || existing.tradespersonProfileId !== profile.id)
      throw new NotFoundException('Template not found');
    const t = await this.prisma.messageTemplate.update({
      where: { id: templateId },
      data: { name: dto.name, body: dto.body },
    });
    return { id: t.id, name: t.name, body: t.body };
  }

  async deleteMessageTemplate(userId: string, templateId: string) {
    const profile = await this.getProfileOrThrow(userId);
    const existing = await this.prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });
    if (!existing || existing.tradespersonProfileId !== profile.id)
      throw new NotFoundException('Template not found');
    await this.prisma.messageTemplate.delete({ where: { id: templateId } });
  }

  // ── Profile documents (certificates, insurance) ──────────────────────────

  async uploadDocument(userId: string, file: Express.Multer.File) {
    const profile = await this.getProfileOrThrow(userId);
    const fileUrl = await this.uploads.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'profile-documents',
    );
    const doc = await this.prisma.profileDocument.create({
      data: {
        tradespersonProfileId: profile.id,
        fileUrl,
        fileName: file.originalname.slice(0, 200),
        mimeType: file.mimetype,
      },
    });
    return {
      id: doc.id,
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt,
    };
  }

  async deleteDocument(userId: string, docId: string) {
    const profile = await this.getProfileOrThrow(userId);
    const doc = await this.prisma.profileDocument.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.tradespersonProfileId !== profile.id)
      throw new NotFoundException('Document not found');
    await this.prisma.profileDocument.delete({ where: { id: docId } });
    void this.uploads.deleteFile(doc.fileUrl);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private computeBadges(profile: {
    verificationStatus: string;
    avgRating: number;
    reviewCount: number;
    completedJobs: number;
    responseTime?: string | null;
  }): string[] {
    const badges: string[] = [];
    if (profile.verificationStatus === 'APPROVED') badges.push('Verified');
    if (profile.avgRating >= 4.8 && profile.reviewCount >= 10)
      badges.push('Top Rated');
    if (profile.completedJobs >= 50) badges.push('50+ Jobs');
    else if (profile.completedJobs >= 10) badges.push('10+ Jobs');
    if (
      profile.responseTime &&
      profile.responseTime.toLowerCase().includes('hour')
    )
      badges.push('Responds Fast');
    return badges;
  }
}
