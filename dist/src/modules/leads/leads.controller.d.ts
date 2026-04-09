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
    getLead(user: JwtPayload, id: string): Promise<{
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
            answersJson: import("@prisma/client/runtime/client").JsonValue | null;
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
    expressInterest(user: JwtPayload, id: string, dto: ExpressInterestDto): Promise<{
        leadStatus: "INTERESTED";
        creditsDeducted: number;
        newBalance: number;
        quoteId: string;
        conversationId: string;
    }>;
}
