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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
let ReviewsService = class ReviewsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createReview(authorId, dto) {
        const { jobId, tradespersonId, rating, comment } = dto;
        const job = await this.prisma.job.findUnique({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (job.status !== 'COMPLETED') {
            throw new common_1.BadRequestException('Reviews can only be left on completed jobs');
        }
        if (job.homeownerId !== authorId) {
            throw new common_1.ForbiddenException('Only the homeowner can leave a review for this job');
        }
        const hiredLead = await this.prisma.lead.findFirst({
            where: {
                jobId,
                tradespersonId,
                status: 'HIRED',
            },
        });
        if (!hiredLead) {
            throw new common_1.ForbiddenException('You can only review the tradesperson hired for this job');
        }
        const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
        const updatedAt = job.updatedAt;
        if (Date.now() - updatedAt.getTime() > ninetyDaysMs) {
            throw new common_1.BadRequestException('Review window has expired (90 days after completion)');
        }
        const existing = await this.prisma.review.findUnique({
            where: { jobId_authorId: { jobId, authorId } },
        });
        if (existing) {
            throw new common_1.ConflictException('You have already left a review for this job');
        }
        const review = await this.prisma.review.create({
            data: {
                jobId,
                authorId,
                subjectId: tradespersonId,
                rating,
                comment,
            },
        });
        void this.recalculateRating(tradespersonId);
        return { id: review.id };
    }
    async getReviews(query) {
        const { tradespersonId, page = 1, perPage = 10 } = query;
        const [total, reviews] = await Promise.all([
            this.prisma.review.count({ where: { subjectId: tradespersonId } }),
            this.prisma.review.findMany({
                where: { subjectId: tradespersonId },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * perPage,
                take: perPage,
                include: {
                    author: { select: { name: true, avatarUrl: true } },
                    job: { select: { title: true } },
                    reply: { select: { body: true, createdAt: true } },
                },
            }),
        ]);
        return {
            data: reviews.map((r) => ({
                id: r.id,
                authorName: r.author.name,
                authorAvatar: r.author.avatarUrl,
                rating: r.rating,
                comment: r.comment,
                jobTitle: r.job.title,
                createdAt: r.createdAt,
                reply: r.reply
                    ? { body: r.reply.body, createdAt: r.reply.createdAt }
                    : undefined,
            })),
            meta: {
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            },
        };
    }
    async replyToReview(reviewId, userId, dto) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
            include: { reply: true },
        });
        if (!review)
            throw new common_1.NotFoundException('Review not found');
        if (review.subjectId !== userId) {
            throw new common_1.ForbiddenException('Only the reviewed tradesperson can reply');
        }
        if (review.reply) {
            throw new common_1.ConflictException('A reply has already been posted for this review');
        }
        const reply = await this.prisma.reviewReply.create({
            data: {
                reviewId,
                authorId: userId,
                body: dto.body,
            },
        });
        return { id: reply.id, body: reply.body, createdAt: reply.createdAt };
    }
    async recalculateRating(tradespersonId) {
        const result = await this.prisma.review.aggregate({
            where: { subjectId: tradespersonId },
            _avg: { rating: true },
            _count: { rating: true },
        });
        const avgRating = result._avg.rating ?? 0;
        const reviewCount = result._count.rating;
        await this.prisma.tradespersonProfile.update({
            where: { userId: tradespersonId },
            data: {
                avgRating: Math.round(avgRating * 10) / 10,
                reviewCount,
            },
        });
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map