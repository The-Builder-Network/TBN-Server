"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
const uploads_service_js_1 = require("../uploads/uploads.service.js");
const postcode_service_js_1 = require("../jobs/postcode.service.js");
let UsersService = class UsersService {
    prisma;
    uploads;
    postcode;
    constructor(prisma, uploads, postcode) {
        this.prisma = prisma;
        this.uploads = uploads;
        this.postcode = postcode;
    }
    async getPublicProfile(username) {
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
        if (!profile)
            throw new common_1.NotFoundException('Profile not found');
        const reviews = await this.prisma.review.findMany({
            where: { subjectId: profile.userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                author: { select: { name: true, avatarUrl: true } },
                reply: { select: { body: true, createdAt: true } },
            },
        });
        const allRatings = await this.prisma.review.groupBy({
            by: ['rating'],
            where: { subjectId: profile.userId },
            _count: { rating: true },
        });
        const ratingBreakdown = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
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
    async getMyProfile(userId) {
        const profile = await this.prisma.tradespersonProfile.findUnique({
            where: { userId },
            include: {
                services: true,
                qualifications: true,
                portfolioItems: { orderBy: { sortOrder: 'asc' } },
                messageTemplates: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tradesperson profile not found');
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
    async updateMyProfile(userId, dto) {
        const profile = await this.prisma.tradespersonProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tradesperson profile not found');
        let lat;
        let lng;
        if (dto.postcode && dto.postcode !== profile.postcode) {
            const geo = await this.postcode.geocode(dto.postcode);
            lat = geo.latitude;
            lng = geo.longitude;
        }
        const updated = await this.prisma.tradespersonProfile.update({
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
        });
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
    async updateUser(userId, dto) {
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
    async uploadAvatar(userId, file) {
        const avatarUrl = await this.uploads.uploadFile(file.buffer, file.originalname, file.mimetype, 'avatars');
        await this.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
        });
        return { avatarUrl };
    }
    async uploadIdDocument(userId, file) {
        const profile = await this.prisma.tradespersonProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tradesperson profile not found');
        const documentUrl = await this.uploads.uploadFile(file.buffer, file.originalname, file.mimetype, 'id-documents');
        await this.prisma.tradespersonProfile.update({
            where: { userId },
            data: {
                idDocumentUrl: documentUrl,
                verificationStatus: 'PENDING',
            },
        });
        return { message: 'Document uploaded. Verification pending.' };
    }
    async addService(userId, dto) {
        const profile = await this.prisma.tradespersonProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tradesperson profile not found');
        try {
            const service = await this.prisma.tradespersonService.create({
                data: {
                    tradespersonProfileId: profile.id,
                    serviceSlug: dto.serviceSlug,
                    tradeSlug: dto.tradeSlug,
                },
            });
            return { id: service.id, serviceSlug: service.serviceSlug, tradeSlug: service.tradeSlug };
        }
        catch {
            throw new common_1.ConflictException('Service already added');
        }
    }
    async removeService(userId, serviceId) {
        const profile = await this.prisma.tradespersonProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tradesperson profile not found');
        const service = await this.prisma.tradespersonService.findUnique({
            where: { id: serviceId },
        });
        if (!service || service.tradespersonProfileId !== profile.id) {
            throw new common_1.ForbiddenException('Service not found');
        }
        await this.prisma.tradespersonService.delete({ where: { id: serviceId } });
    }
    async addQualification(userId, dto) {
        const profile = await this.prisma.tradespersonProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tradesperson profile not found');
        const qual = await this.prisma.qualification.create({
            data: {
                tradespersonProfileId: profile.id,
                name: dto.name,
                year: dto.year,
            },
        });
        return { id: qual.id, name: qual.name, verified: qual.verified, year: qual.year };
    }
    async removeQualification(userId, qualId) {
        const profile = await this.prisma.tradespersonProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tradesperson profile not found');
        const qual = await this.prisma.qualification.findUnique({
            where: { id: qualId },
        });
        if (!qual || qual.tradespersonProfileId !== profile.id) {
            throw new common_1.ForbiddenException('Qualification not found');
        }
        await this.prisma.qualification.delete({ where: { id: qualId } });
    }
    async uploadPortfolioItem(userId, file, title, category) {
        const profile = await this.prisma.tradespersonProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tradesperson profile not found');
        const imageUrl = await this.uploads.uploadFile(file.buffer, file.originalname, file.mimetype, 'portfolio');
        const item = await this.prisma.portfolioItem.create({
            data: {
                tradespersonProfileId: profile.id,
                imageUrl,
                title,
                category,
            },
        });
        return { id: item.id, imageUrl: item.imageUrl, title: item.title, category: item.category };
    }
    async deletePortfolioItem(userId, itemId) {
        const profile = await this.prisma.tradespersonProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tradesperson profile not found');
        const item = await this.prisma.portfolioItem.findUnique({
            where: { id: itemId },
        });
        if (!item || item.tradespersonProfileId !== profile.id) {
            throw new common_1.ForbiddenException('Portfolio item not found');
        }
        await this.uploads.deleteFile(item.imageUrl);
        await this.prisma.portfolioItem.delete({ where: { id: itemId } });
    }
    async createMessageTemplate(userId, dto) {
        const profile = await this.prisma.tradespersonProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tradesperson profile not found');
        const template = await this.prisma.messageTemplate.create({
            data: {
                tradespersonProfileId: profile.id,
                name: dto.name,
                body: dto.body,
            },
        });
        return { id: template.id, name: template.name, body: template.body };
    }
    async updateMessageTemplate(userId, templateId, dto) {
        const profile = await this.prisma.tradespersonProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tradesperson profile not found');
        const existing = await this.prisma.messageTemplate.findUnique({
            where: { id: templateId },
        });
        if (!existing || existing.tradespersonProfileId !== profile.id) {
            throw new common_1.ForbiddenException('Template not found');
        }
        const updated = await this.prisma.messageTemplate.update({
            where: { id: templateId },
            data: { name: dto.name, body: dto.body },
        });
        return { id: updated.id, name: updated.name, body: updated.body };
    }
    async deleteMessageTemplate(userId, templateId) {
        const profile = await this.prisma.tradespersonProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tradesperson profile not found');
        const existing = await this.prisma.messageTemplate.findUnique({
            where: { id: templateId },
        });
        if (!existing || existing.tradespersonProfileId !== profile.id) {
            throw new common_1.ForbiddenException('Template not found');
        }
        await this.prisma.messageTemplate.delete({ where: { id: templateId } });
    }
    computeBadges(profile) {
        const badges = [];
        if (profile.verificationStatus === 'APPROVED')
            badges.push('Verified');
        if (profile.avgRating >= 4.8 && profile.reviewCount >= 10)
            badges.push('Top Rated');
        if (profile.completedJobs >= 50)
            badges.push('50+ Jobs');
        else if (profile.completedJobs >= 10)
            badges.push('10+ Jobs');
        if (profile.responseTime &&
            profile.responseTime.toLowerCase().includes('hour')) {
            badges.push('Responds Fast');
        }
        return badges;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        uploads_service_js_1.UploadsService,
        postcode_service_js_1.PostcodeService])
], UsersService);
//# sourceMappingURL=users.service.js.map