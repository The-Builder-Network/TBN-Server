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
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
const uploads_service_js_1 = require("../uploads/uploads.service.js");
const postcode_service_js_1 = require("./postcode.service.js");
const credit_cost_helper_js_1 = require("./credit-cost.helper.js");
const client_1 = require("@prisma/client");
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 3959;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
let JobsService = class JobsService {
    prisma;
    uploads;
    postcode;
    constructor(prisma, uploads, postcode) {
        this.prisma = prisma;
        this.uploads = uploads;
        this.postcode = postcode;
    }
    async createJob(homeownerId, dto, attachmentFiles) {
        const geo = await this.postcode.geocode(dto.postcode);
        const uploadedAttachments = [];
        for (const file of attachmentFiles) {
            const url = await this.uploads.uploadFile(file.buffer, file.originalname, file.mimetype, 'job-attachments');
            uploadedAttachments.push({
                fileUrl: url,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
            });
        }
        const job = await this.prisma.job.create({
            data: {
                homeownerId,
                title: dto.title,
                description: dto.description,
                serviceSlug: dto.serviceSlug,
                tradeSlug: dto.tradeSlug,
                postcode: dto.postcode.toUpperCase().trim(),
                placeName: geo.placeName,
                latitude: geo.latitude,
                longitude: geo.longitude,
                answersJson: (dto.answersJson ?? {}),
                status: client_1.JobStatus.ACTIVE,
                attachments: {
                    create: uploadedAttachments,
                },
            },
        });
        const matchedCount = await this.matchTradespersons(job.id, dto.serviceSlug, geo);
        return {
            id: job.id,
            jobNumber: job.jobNumber,
            status: job.status,
            matchedCount,
            createdAt: job.createdAt,
        };
    }
    async matchTradespersons(jobId, serviceSlug, geo) {
        const creditCost = (0, credit_cost_helper_js_1.calculateCreditCost)(serviceSlug);
        const candidates = await this.prisma.tradespersonProfile.findMany({
            where: {
                verificationStatus: 'APPROVED',
                latitude: { not: null },
                longitude: { not: null },
                services: {
                    some: { serviceSlug },
                },
            },
            select: {
                userId: true,
                latitude: true,
                longitude: true,
                workRadiusMiles: true,
            },
        });
        const matched = [];
        for (const tp of candidates) {
            if (tp.latitude === null || tp.longitude === null)
                continue;
            const dist = haversineDistance(geo.latitude, geo.longitude, tp.latitude, tp.longitude);
            if (dist <= tp.workRadiusMiles) {
                matched.push({ userId: tp.userId, distanceMiles: dist });
            }
        }
        if (matched.length === 0)
            return 0;
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.prisma.lead.createMany({
            data: matched.map((m) => ({
                jobId,
                tradespersonId: m.userId,
                creditCost,
                distanceMiles: m.distanceMiles,
                expiresAt,
            })),
            skipDuplicates: true,
        });
        return matched.length;
    }
    async getJobs(homeownerId, query) {
        const page = query.page ?? 1;
        const perPage = query.perPage ?? 10;
        const skip = (page - 1) * perPage;
        const where = {
            homeownerId,
            ...(query.status ? { status: query.status } : {}),
        };
        const [total, jobs] = await Promise.all([
            this.prisma.job.count({ where }),
            this.prisma.job.findMany({
                where,
                skip,
                take: perPage,
                orderBy: {
                    [query.sort ?? 'createdAt']: query.order ?? 'desc',
                },
                select: {
                    id: true,
                    jobNumber: true,
                    title: true,
                    status: true,
                    serviceSlug: true,
                    postcode: true,
                    placeName: true,
                    createdAt: true,
                    _count: {
                        select: {
                            leads: { where: { status: { in: ['INTERESTED', 'SHORTLISTED', 'CONTACTED', 'HIRED'] } } },
                        },
                    },
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
                interestedCount: j._count.leads,
                createdAt: j.createdAt,
            })),
            meta: {
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            },
        };
    }
    async getJob(jobId, requesterId, requesterRole) {
        const job = await this.prisma.job.findUnique({
            where: { id: jobId },
            include: {
                attachments: true,
                leads: {
                    where: {
                        status: { in: ['INTERESTED', 'SHORTLISTED', 'CONTACTED', 'HIRED'] },
                    },
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
                                        verificationStatus: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { interestedAt: 'desc' },
                },
                quotes: {
                    where: { status: { in: ['PENDING', 'ACCEPTED'] } },
                    select: {
                        id: true,
                        tradespersonId: true,
                        message: true,
                        amountPence: true,
                        estimateRange: true,
                        status: true,
                    },
                },
            },
        });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (requesterRole === 'HOMEOWNER' && job.homeownerId !== requesterId) {
            throw new common_1.ForbiddenException('Not your job');
        }
        if (requesterRole === 'TRADESPERSON') {
            const lead = await this.prisma.lead.findFirst({
                where: { jobId, tradespersonId: requesterId },
            });
            if (!lead)
                throw new common_1.ForbiddenException('No lead for this job');
        }
        return {
            id: job.id,
            jobNumber: job.jobNumber,
            title: job.title,
            description: job.description,
            serviceSlug: job.serviceSlug,
            postcode: job.postcode,
            placeName: job.placeName,
            status: job.status,
            answersJson: job.answersJson,
            createdAt: job.createdAt,
            attachments: job.attachments.map((a) => ({
                id: a.id,
                fileUrl: a.fileUrl,
                fileName: a.fileName,
                mimeType: a.mimeType,
            })),
            responses: job.leads.map((lead) => {
                const quote = job.quotes.find((q) => q.tradespersonId === lead.tradespersonId);
                return {
                    leadId: lead.id,
                    leadStatus: lead.status,
                    tradesperson: {
                        id: lead.tradesperson.id,
                        name: lead.tradesperson.name,
                        avatarUrl: lead.tradesperson.avatarUrl,
                        username: lead.tradesperson.tradespersonProfile?.username,
                        companyName: lead.tradesperson.tradespersonProfile?.companyName,
                        avgRating: lead.tradesperson.tradespersonProfile?.avgRating ?? 0,
                        reviewCount: lead.tradesperson.tradespersonProfile?.reviewCount ?? 0,
                        verified: lead.tradesperson.tradespersonProfile?.verificationStatus === 'APPROVED',
                    },
                    quote: quote
                        ? {
                            id: quote.id,
                            message: quote.message,
                            amountPence: quote.amountPence,
                            estimateRange: quote.estimateRange,
                            status: quote.status,
                        }
                        : undefined,
                };
            }),
        };
    }
    async updateJobStatus(jobId, homeownerId, dto) {
        const job = await this.prisma.job.findUnique({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (job.homeownerId !== homeownerId)
            throw new common_1.ForbiddenException('Not your job');
        const terminal = ['CANCELLED', 'CLOSED', 'COMPLETED'];
        if (terminal.includes(job.status)) {
            throw new common_1.BadRequestException(`Cannot update a job with status ${job.status}`);
        }
        const updated = await this.prisma.job.update({
            where: { id: jobId },
            data: { status: dto.status },
        });
        return { id: updated.id, status: updated.status };
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        uploads_service_js_1.UploadsService,
        postcode_service_js_1.PostcodeService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map