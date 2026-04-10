import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { PostcodeService } from '../jobs/postcode.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { AddServiceDto } from './dto/add-service.dto.js';
import type { AddQualificationDto } from './dto/add-qualification.dto.js';
import type { CreateMessageTemplateDto } from './dto/create-message-template.dto.js';
import type { UpdateMessageTemplateDto } from './dto/update-message-template.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import { handlePrismaError } from '../../common/prisma-error.helper.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly postcode: PostcodeService,
  ) {}

  // ── GET /users/:username — public profile ─────────────────────────────────

  async getPublicProfile(username: string) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { username },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
        services: true,
        qualifications: true,
        portfolioItems: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    // Fetch recent reviews (up to 10)
    const reviews = await this.prisma.review.findMany({
      where: { subjectId: profile.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        author: { select: { name: true, avatarUrl: true } },
        reply: { select: { body: true, createdAt: true } },
      },
    });

    // Rating breakdown
    const allRatings = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { subjectId: profile.userId },
      _count: { rating: true },
    });
    const ratingBreakdown: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    for (const r of allRatings) {
      ratingBreakdown[String(r.rating)] = r._count.rating;
    }

    return {
      username: profile.username,
      name: profile.user.name,
      companyName: profile.companyName,
      trade: profile.trade,
      avatarUrl: profile.user.avatarUrl,
      bio: profile.bio,
      postcode: profile.postcode,
      memberSince: profile.user.createdAt,
      verified: profile.verificationStatus === 'APPROVED',
      avgRating: profile.avgRating,
      reviewCount: profile.reviewCount,
      completedJobs: profile.completedJobs,
      badges: this.computeBadges(profile),
      workRadiusMiles: profile.workRadiusMiles,
      services: profile.services.map((s) => s.serviceSlug),
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
        authorName: r.author.name,
        authorAvatar: r.author.avatarUrl,
        rating: r.rating,
        comment: r.comment,
        jobTitle: '',
        createdAt: r.createdAt,
        reply: r.reply
          ? { body: r.reply.body, createdAt: r.reply.createdAt }
          : undefined,
      })),
    };
  }

  // ── GET /users/me/profile — own tradesperson profile ──────────────────────

  async getMyProfile(userId: string) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
      include: {
        services: true,
        qualifications: true,
        portfolioItems: { orderBy: { sortOrder: 'asc' } },
        messageTemplates: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!profile) throw new NotFoundException('Tradesperson profile not found');

    return {
      id: profile.id,
      username: profile.username,
      companyName: profile.companyName,
      bio: profile.bio,
      trade: profile.trade,
      postcode: profile.postcode,
      workRadiusMiles: profile.workRadiusMiles,
      verificationStatus: profile.verificationStatus,
      guarantee: profile.guarantee,
      avgRating: profile.avgRating,
      reviewCount: profile.reviewCount,
      completedJobs: profile.completedJobs,
      services: profile.services.map((s) => ({
        id: s.id,
        serviceSlug: s.serviceSlug,
        tradeSlug: s.tradeSlug,
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
    };
  }

  // ── PATCH /users/me/profile ───────────────────────────────────────────────

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');

    let lat: number | undefined;
    let lng: number | undefined;

    if (dto.postcode && dto.postcode !== profile.postcode) {
      const geo = await this.postcode.geocode(dto.postcode);
      lat = geo.latitude;
      lng = geo.longitude;
    }

    const updated = await this.prisma.tradespersonProfile
      .update({
        where: { userId },
        data: {
          companyName: dto.companyName,
          bio: dto.bio,
          trade: dto.trade,
          postcode: dto.postcode?.toUpperCase().trim(),
          workRadiusMiles: dto.workRadiusMiles,
          guarantee: dto.guarantee,
          responseTime: dto.responseTime,
          ...(lat !== undefined ? { latitude: lat, longitude: lng } : {}),
        },
        include: {
          services: true,
          qualifications: true,
          portfolioItems: { orderBy: { sortOrder: 'asc' } },
          messageTemplates: { orderBy: { createdAt: 'asc' } },
        },
      })
      .catch(handlePrismaError);

    return {
      id: updated.id,
      username: updated.username,
      companyName: updated.companyName,
      bio: updated.bio,
      trade: updated.trade,
      postcode: updated.postcode,
      workRadiusMiles: updated.workRadiusMiles,
      verificationStatus: updated.verificationStatus,
      guarantee: updated.guarantee,
      avgRating: updated.avgRating,
      reviewCount: updated.reviewCount,
      completedJobs: updated.completedJobs,
      services: updated.services.map((s) => ({
        id: s.id,
        serviceSlug: s.serviceSlug,
        tradeSlug: s.tradeSlug,
      })),
      qualifications: updated.qualifications.map((q) => ({
        id: q.id,
        name: q.name,
        verified: q.verified,
        year: q.year,
      })),
      portfolioItems: updated.portfolioItems.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        title: p.title,
        category: p.category,
      })),
      insurance: {
        publicLiability: updated.publicLiability,
        employersLiability: updated.employersLiability,
        professionalIndemnity: updated.professionalIndemnity,
        verified: updated.insuranceVerified,
        expiresAt: updated.insuranceExpiresAt,
      },
      messageTemplates: updated.messageTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        body: t.body,
      })),
    };
  }

  // ── PATCH /users/me — update name/phone ───────────────────────────────────

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        phone: dto.phone,
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        phone: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    return user;
  }

  // ── POST /users/me/avatar ─────────────────────────────────────────────────

  async uploadAvatar(userId: string, file: Express.Multer.File) {
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
    return { avatarUrl };
  }

  // ── POST /users/me/id-document ────────────────────────────────────────────

  async uploadIdDocument(userId: string, file: Express.Multer.File) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');

    const documentUrl = await this.uploads.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'id-documents',
    );

    await this.prisma.tradespersonProfile.update({
      where: { userId },
      data: {
        idDocumentUrl: documentUrl,
        verificationStatus: 'PENDING',
      },
    });

    return { message: 'Document uploaded. Verification pending.' };
  }

  // ── POST /users/me/services ───────────────────────────────────────────────

  async addService(userId: string, dto: AddServiceDto) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');

    try {
      const service = await this.prisma.tradespersonService.create({
        data: {
          tradespersonProfileId: profile.id,
          serviceSlug: dto.serviceSlug,
          tradeSlug: dto.tradeSlug,
        },
      });
      return {
        id: service.id,
        serviceSlug: service.serviceSlug,
        tradeSlug: service.tradeSlug,
      };
    } catch {
      throw new ConflictException('Service already added');
    }
  }

  // ── DELETE /users/me/services/:id ─────────────────────────────────────────

  async removeService(userId: string, serviceId: string) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');

    const service = await this.prisma.tradespersonService.findUnique({
      where: { id: serviceId },
    });
    if (!service || service.tradespersonProfileId !== profile.id) {
      throw new ForbiddenException('Service not found');
    }

    await this.prisma.tradespersonService.delete({ where: { id: serviceId } });
  }

  // ── POST /users/me/qualifications ─────────────────────────────────────────

  async addQualification(userId: string, dto: AddQualificationDto) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');

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

  // ── DELETE /users/me/qualifications/:id ───────────────────────────────────

  async removeQualification(userId: string, qualId: string) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');

    const qual = await this.prisma.qualification.findUnique({
      where: { id: qualId },
    });
    if (!qual || qual.tradespersonProfileId !== profile.id) {
      throw new ForbiddenException('Qualification not found');
    }

    await this.prisma.qualification.delete({ where: { id: qualId } });
  }

  // ── POST /users/me/portfolio ──────────────────────────────────────────────

  async uploadPortfolioItem(
    userId: string,
    file: Express.Multer.File,
    title?: string,
    category?: string,
  ) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');

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
        title,
        category,
      },
    });

    return {
      id: item.id,
      imageUrl: item.imageUrl,
      title: item.title,
      category: item.category,
    };
  }

  // ── DELETE /users/me/portfolio/:id ────────────────────────────────────────

  async deletePortfolioItem(userId: string, itemId: string) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');

    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.tradespersonProfileId !== profile.id) {
      throw new ForbiddenException('Portfolio item not found');
    }

    // Delete from R2
    await this.uploads.deleteFile(item.imageUrl);
    await this.prisma.portfolioItem.delete({ where: { id: itemId } });
  }

  // ── POST /users/me/message-templates ─────────────────────────────────────

  async createMessageTemplate(userId: string, dto: CreateMessageTemplateDto) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');

    const template = await this.prisma.messageTemplate.create({
      data: {
        tradespersonProfileId: profile.id,
        name: dto.name,
        body: dto.body,
      },
    });
    return { id: template.id, name: template.name, body: template.body };
  }

  // ── PATCH /users/me/message-templates/:id ────────────────────────────────

  async updateMessageTemplate(
    userId: string,
    templateId: string,
    dto: UpdateMessageTemplateDto,
  ) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');

    const existing = await this.prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });
    if (!existing || existing.tradespersonProfileId !== profile.id) {
      throw new ForbiddenException('Template not found');
    }

    const updated = await this.prisma.messageTemplate.update({
      where: { id: templateId },
      data: { name: dto.name, body: dto.body },
    });
    return { id: updated.id, name: updated.name, body: updated.body };
  }

  // ── DELETE /users/me/message-templates/:id ────────────────────────────────

  async deleteMessageTemplate(userId: string, templateId: string) {
    const profile = await this.prisma.tradespersonProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tradesperson profile not found');

    const existing = await this.prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });
    if (!existing || existing.tradespersonProfileId !== profile.id) {
      throw new ForbiddenException('Template not found');
    }

    await this.prisma.messageTemplate.delete({ where: { id: templateId } });
  }

  // ── Helper: compute badge labels ──────────────────────────────────────────

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
    ) {
      badges.push('Responds Fast');
    }
    return badges;
  }
}
