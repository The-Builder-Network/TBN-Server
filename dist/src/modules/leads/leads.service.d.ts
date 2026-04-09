import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { GetLeadsQueryDto } from './dto/get-leads-query.dto.js';
import type { ExpressInterestDto } from './dto/express-interest.dto.js';
export declare class LeadsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    countAvailableLeadsNear(_postcode: string, _radiusMiles: number): Promise<number>;
    getLeads(tradespersonId: string, query: GetLeadsQueryDto): Promise<{
        data: {
            id: string;
            status: import("@prisma/client").$Enums.LeadStatus;
            creditCost: number;
            distanceMiles: number | null;
            expiresAt: Date | null;
            createdAt: Date;
            job: {
                id: string;
                createdAt: Date;
                title: string;
                serviceSlug: string;
                tradeSlug: string | null;
                postcode: string;
                placeName: string | null;
            };
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
                jobId: string;
                createdAt: Date;
                fileUrl: string;
                fileName: string;
                fileSize: number;
                mimeType: string;
            }[];
        } & {
            id: string;
            status: import("@prisma/client").$Enums.JobStatus;
            createdAt: Date;
            updatedAt: Date;
            homeownerId: string;
            title: string;
            description: string;
            serviceSlug: string;
            tradeSlug: string | null;
            postcode: string;
            placeName: string | null;
            latitude: number | null;
            longitude: number | null;
            answersJson: Prisma.JsonValue | null;
        };
    } & {
        id: string;
        jobId: string;
        tradespersonId: string;
        status: import("@prisma/client").$Enums.LeadStatus;
        creditCost: number;
        distanceMiles: number | null;
        interestedAt: Date | null;
        shortlistedAt: Date | null;
        contactedAt: Date | null;
        hiredAt: Date | null;
        rejectedAt: Date | null;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
