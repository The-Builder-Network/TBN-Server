import { LeadsService } from './leads.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { GetLeadsQueryDto } from './dto/get-leads-query.dto.js';
import { ExpressInterestDto } from './dto/express-interest.dto.js';
export declare class LeadsController {
    private readonly leadsService;
    constructor(leadsService: LeadsService);
    countLeads(postcode: string, radius: string): Promise<{
        count: number;
    }>;
    getLeads(user: JwtPayload, query: GetLeadsQueryDto): Promise<{
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
    getLead(user: JwtPayload, id: string): Promise<{
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
            answersJson: import("@prisma/client/runtime/client").JsonValue | null;
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
    expressInterest(user: JwtPayload, id: string, dto: ExpressInterestDto): Promise<{
        leadStatus: "INTERESTED";
        creditsDeducted: number;
        newBalance: number;
        quoteId: string;
        conversationId: string;
    }>;
}
