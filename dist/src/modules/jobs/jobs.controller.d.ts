import type { JwtPayload } from '../auth/auth.service.js';
import { JobsService } from './jobs.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { GetJobsQueryDto } from './dto/get-jobs-query.dto.js';
import { UpdateJobStatusDto } from './dto/update-job-status.dto.js';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    createJob(user: JwtPayload, dto: CreateJobDto, attachments?: Express.Multer.File[]): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.JobStatus;
        matchedCount: number;
        createdAt: Date;
    }>;
    getJobs(user: JwtPayload, query: GetJobsQueryDto): Promise<{
        data: {
            id: string;
            title: string;
            status: import("@prisma/client").$Enums.JobStatus;
            serviceSlug: string;
            postcode: string;
            placeName: string | null;
            interestedCount: number;
            createdAt: Date;
        }[];
        meta: {
            total: number;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    getJob(user: JwtPayload, id: string): Promise<{
        id: string;
        title: string;
        description: string;
        serviceSlug: string;
        postcode: string;
        placeName: string | null;
        status: import("@prisma/client").$Enums.JobStatus;
        answersJson: import("@prisma/client/runtime/client").JsonValue;
        createdAt: Date;
        attachments: {
            id: string;
            fileUrl: string;
            fileName: string;
            mimeType: string;
        }[];
        responses: {
            leadId: string;
            leadStatus: import("@prisma/client").$Enums.LeadStatus;
            tradesperson: {
                id: string;
                name: string;
                avatarUrl: string | null;
                username: string | undefined;
                companyName: string | null | undefined;
                avgRating: number;
                reviewCount: number;
                verified: boolean;
            };
            quote: {
                id: string;
                message: string;
                amountPence: number | null;
                estimateRange: string | null;
                status: import("@prisma/client").$Enums.QuoteStatus;
            } | undefined;
        }[];
    }>;
    updateJobStatus(user: JwtPayload, id: string, dto: UpdateJobStatusDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.JobStatus;
    }>;
}
