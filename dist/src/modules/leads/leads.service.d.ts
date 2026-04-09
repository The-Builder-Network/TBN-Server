import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { GetLeadsQueryDto } from './dto/get-leads-query.dto.js';
import type { ExpressInterestDto } from './dto/express-interest.dto.js';
import { PaymentsService } from '../payments/payments.service.js';
export declare class LeadsService {
    private readonly prisma;
    private readonly paymentsService;
    constructor(prisma: PrismaService, paymentsService: PaymentsService);
    countAvailableLeadsNear(_postcode: string, _radiusMiles: number): Promise<number>;
    getLeads(tradespersonId: string, query: GetLeadsQueryDto): Promise<{
        data: {
            job: {
                serviceSlug: string;
                id: string;
                createdAt: Date;
                postcode: string;
                placeName: string | null;
                tradeSlug: string | null;
                title: string;
            };
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.LeadStatus;
            creditCost: number;
            distanceMiles: number | null;
            expiresAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    getLead(leadId: string, tradespersonId: string): Promise<{
        job: {
            attachments: {
                id: string;
                createdAt: Date;
                jobId: string;
                fileUrl: string;
                fileName: string;
                fileSize: number;
                mimeType: string;
            }[];
        } & {
            serviceSlug: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            postcode: string;
            latitude: number | null;
            longitude: number | null;
            placeName: string | null;
            tradeSlug: string | null;
            title: string;
            description: string;
            answersJson: Prisma.JsonValue | null;
            status: import("@prisma/client").$Enums.JobStatus;
            homeownerId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        jobId: string;
        status: import("@prisma/client").$Enums.LeadStatus;
        interestedAt: Date | null;
        tradespersonId: string;
        creditCost: number;
        distanceMiles: number | null;
        shortlistedAt: Date | null;
        contactedAt: Date | null;
        hiredAt: Date | null;
        rejectedAt: Date | null;
        expiresAt: Date | null;
    }>;
    expressInterest(leadId: string, tradespersonId: string, dto: ExpressInterestDto): Promise<{
        leadStatus: "INTERESTED";
        creditsDeducted: number;
        newBalance: number;
        quoteId: string;
        conversationId: string;
    }>;
    getBalance(userId: string): Promise<{
        balance: number;
        autoTopup: boolean;
        topupAmount: number | null;
        topupThreshold: number | null;
        lastTopupAt: Date | null;
    }>;
}
