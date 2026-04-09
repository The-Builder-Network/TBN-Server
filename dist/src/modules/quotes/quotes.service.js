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
exports.QuotesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
const notifications_service_js_1 = require("../notifications/notifications.service.js");
let QuotesService = class QuotesService {
    prisma;
    notifications;
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async getQuotesForJob(jobId, userId) {
        const job = await this.prisma.job.findUnique({
            where: { id: jobId },
            select: { homeownerId: true },
        });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (job.homeownerId !== userId)
            throw new common_1.ForbiddenException();
        const quotes = await this.prisma.quote.findMany({
            where: { jobId },
            orderBy: { createdAt: 'desc' },
            include: {
                tradesperson: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                        tradespersonProfile: {
                            select: {
                                username: true,
                                companyName: true,
                                avgRating: true,
                                reviewCount: true,
                                completedJobs: true,
                            },
                        },
                    },
                },
            },
        });
        return {
            quotes: quotes.map((q) => ({
                id: q.id,
                message: q.message,
                amountPence: q.amountPence,
                estimateRange: q.estimateRange,
                status: q.status,
                createdAt: q.createdAt.toISOString(),
                tradesperson: {
                    id: q.tradesperson.id,
                    name: q.tradesperson.name,
                    avatarUrl: q.tradesperson.avatarUrl,
                    username: q.tradesperson.tradespersonProfile?.username,
                    companyName: q.tradesperson.tradespersonProfile?.companyName,
                    avgRating: q.tradesperson.tradespersonProfile?.avgRating,
                    reviewCount: q.tradesperson.tradespersonProfile?.reviewCount,
                    completedJobs: q.tradesperson.tradespersonProfile?.completedJobs,
                },
            })),
        };
    }
    async acceptQuote(quoteId, userId) {
        const quote = await this.prisma.quote.findUnique({
            where: { id: quoteId },
            include: {
                job: { select: { homeownerId: true, id: true, title: true } },
            },
        });
        if (!quote)
            throw new common_1.NotFoundException('Quote not found');
        if (quote.job.homeownerId !== userId)
            throw new common_1.ForbiddenException();
        if (quote.status !== 'PENDING')
            throw new common_1.BadRequestException('Quote is no longer pending');
        await this.prisma.$transaction(async (tx) => {
            await tx.quote.update({
                where: { id: quoteId },
                data: { status: 'ACCEPTED' },
            });
            await tx.quote.updateMany({
                where: { jobId: quote.jobId, id: { not: quoteId }, status: 'PENDING' },
                data: { status: 'DECLINED' },
            });
            await tx.lead.updateMany({
                where: { jobId: quote.jobId, tradespersonId: quote.tradespersonId },
                data: { status: 'HIRED' },
            });
            await tx.lead.updateMany({
                where: {
                    jobId: quote.jobId,
                    tradespersonId: { not: quote.tradespersonId },
                    status: { in: ['INTERESTED', 'SHORTLISTED', 'CONTACTED'] },
                },
                data: { status: 'REJECTED' },
            });
            await tx.job.update({
                where: { id: quote.jobId },
                data: { status: 'IN_PROGRESS' },
            });
        });
        await this.notifications.createNotification({
            userId: quote.tradespersonId,
            type: 'NEW_QUOTE',
            title: `Your quote was accepted for "${quote.job.title}"`,
            linkUrl: `/tradesperson/my-leads/${quote.jobId}`,
        });
        return { success: true };
    }
    async declineQuote(quoteId, userId) {
        const quote = await this.prisma.quote.findUnique({
            where: { id: quoteId },
            include: { job: { select: { homeownerId: true, title: true } } },
        });
        if (!quote)
            throw new common_1.NotFoundException('Quote not found');
        if (quote.job.homeownerId !== userId)
            throw new common_1.ForbiddenException();
        if (quote.status !== 'PENDING')
            throw new common_1.BadRequestException('Quote is no longer pending');
        await this.prisma.quote.update({
            where: { id: quoteId },
            data: { status: 'DECLINED' },
        });
        return { success: true };
    }
    async withdrawQuote(quoteId, userId) {
        const quote = await this.prisma.quote.findUnique({
            where: { id: quoteId },
        });
        if (!quote)
            throw new common_1.NotFoundException('Quote not found');
        if (quote.tradespersonId !== userId)
            throw new common_1.ForbiddenException();
        if (quote.status !== 'PENDING')
            throw new common_1.BadRequestException('Quote is no longer pending');
        await this.prisma.quote.update({
            where: { id: quoteId },
            data: { status: 'WITHDRAWN' },
        });
        return { success: true };
    }
};
exports.QuotesService = QuotesService;
exports.QuotesService = QuotesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        notifications_service_js_1.NotificationsService])
], QuotesService);
//# sourceMappingURL=quotes.service.js.map