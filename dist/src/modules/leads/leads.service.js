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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
const client_1 = require("@prisma/client");
const payments_service_js_1 = require("../payments/payments.service.js");
let LeadsService = class LeadsService {
    prisma;
    paymentsService;
    constructor(prisma, paymentsService) {
        this.prisma = prisma;
        this.paymentsService = paymentsService;
    }
    async countAvailableLeadsNear(_postcode, _radiusMiles) {
        const count = await this.prisma.job.count({
            where: { status: 'ACTIVE' },
        });
        return count;
    }
    async getLeads(tradespersonId, query) {
        const { status, serviceSlug, maxDistanceMiles, sort = 'createdAt', order = 'desc', page = 1, perPage = 20, } = query;
        const where = {
            tradespersonId,
        };
        if (status) {
            where.status = status;
        }
        if (serviceSlug) {
            where.job = { serviceSlug };
        }
        if (maxDistanceMiles !== undefined && maxDistanceMiles > 0) {
            where.distanceMiles = { lte: maxDistanceMiles };
        }
        const allowedSorts = ['createdAt', 'distanceMiles', 'creditCost'];
        const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';
        const [total, leads] = await Promise.all([
            this.prisma.lead.count({ where }),
            this.prisma.lead.findMany({
                where,
                orderBy: { [sortField]: order },
                skip: (page - 1) * perPage,
                take: perPage,
                select: {
                    id: true,
                    status: true,
                    creditCost: true,
                    distanceMiles: true,
                    createdAt: true,
                    expiresAt: true,
                    job: {
                        select: {
                            id: true,
                            title: true,
                            serviceSlug: true,
                            tradeSlug: true,
                            postcode: true,
                            placeName: true,
                            createdAt: true,
                        },
                    },
                },
            }),
        ]);
        return {
            data: leads,
            meta: {
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            },
        };
    }
    async getLead(leadId, tradespersonId) {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
            include: {
                job: {
                    include: {
                        attachments: true,
                    },
                },
            },
        });
        if (!lead)
            throw new common_1.NotFoundException('Lead not found');
        if (lead.tradespersonId !== tradespersonId)
            throw new common_1.ForbiddenException('Access denied');
        return lead;
    }
    async expressInterest(leadId, tradespersonId, dto) {
        const result = await this.prisma.$transaction(async (tx) => {
            const lead = await tx.lead.findUnique({
                where: { id: leadId },
                include: { job: { select: { id: true, homeownerId: true } } },
            });
            if (!lead)
                throw new common_1.NotFoundException('Lead not found');
            if (lead.tradespersonId !== tradespersonId)
                throw new common_1.ForbiddenException('Access denied');
            if (lead.status !== client_1.LeadStatus.AVAILABLE)
                throw new common_1.BadRequestException(`Lead is not available (current status: ${lead.status})`);
            const creditCost = lead.creditCost;
            const credit = await tx.leadCredit.findUnique({
                where: { userId: tradespersonId },
            });
            const balance = credit?.balance ?? 0;
            if (balance < creditCost) {
                throw new common_1.HttpException({
                    error: 'INSUFFICIENT_CREDITS',
                    required: creditCost,
                    balance,
                }, common_1.HttpStatus.PAYMENT_REQUIRED);
            }
            const updated = await tx.leadCredit.update({
                where: { userId: tradespersonId },
                data: { balance: { decrement: creditCost } },
            });
            await tx.lead.update({
                where: { id: leadId },
                data: {
                    status: client_1.LeadStatus.INTERESTED,
                    interestedAt: new Date(),
                },
            });
            const quote = await tx.quote.create({
                data: {
                    jobId: lead.job.id,
                    tradespersonId,
                    message: dto.message,
                    amountPence: dto.quoteAmountPence ?? null,
                    status: 'PENDING',
                },
            });
            const conversation = await tx.conversation.upsert({
                where: {
                    jobId_homeownerId_tradespersonId: {
                        jobId: lead.job.id,
                        homeownerId: lead.job.homeownerId,
                        tradespersonId,
                    },
                },
                create: {
                    jobId: lead.job.id,
                    homeownerId: lead.job.homeownerId,
                    tradespersonId,
                    messages: {
                        create: {
                            senderId: tradespersonId,
                            body: dto.message,
                        },
                    },
                },
                update: {},
            });
            await tx.notification.create({
                data: {
                    userId: lead.job.homeownerId,
                    type: 'NEW_INTEREST',
                    title: 'A tradesperson is interested in your job',
                    linkUrl: `/homeowner/my-jobs/${lead.job.id}`,
                },
            });
            if (dto.quoteAmountPence) {
                await tx.notification.create({
                    data: {
                        userId: lead.job.homeownerId,
                        type: 'NEW_QUOTE',
                        title: 'New quote received',
                        linkUrl: `/homeowner/my-jobs/${lead.job.id}`,
                    },
                });
            }
            return {
                leadStatus: client_1.LeadStatus.INTERESTED,
                creditsDeducted: creditCost,
                newBalance: updated.balance,
                quoteId: quote.id,
                conversationId: conversation.id,
            };
        }, { isolationLevel: 'Serializable' });
        this.paymentsService.triggerAutoTopupIfNeeded(tradespersonId).catch(() => {
        });
        return result;
    }
    async getBalance(userId) {
        const credit = await this.prisma.leadCredit.findUnique({
            where: { userId },
        });
        return {
            balance: credit?.balance ?? 0,
            autoTopup: credit?.autoTopup ?? false,
            topupAmount: credit?.topupAmount ?? null,
            topupThreshold: credit?.topupThreshold ?? null,
            lastTopupAt: credit?.lastTopupAt ?? null,
        };
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        payments_service_js_1.PaymentsService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map