import { PrismaService } from '../../prisma/prisma.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { PostcodeService } from './postcode.service.js';
import type { CreateJobDto } from './dto/create-job.dto.js';
import type { GetJobsQueryDto } from './dto/get-jobs-query.dto.js';
import type { UpdateJobStatusDto } from './dto/update-job-status.dto.js';
export declare class JobsService {
    private readonly prisma;
    private readonly uploads;
    private readonly postcode;
    constructor(prisma: PrismaService, uploads: UploadsService, postcode: PostcodeService);
    createJob(homeownerId: string, dto: CreateJobDto, attachmentFiles: Express.Multer.File[]): Promise<{
        id: string;
        jobNumber: number;
        status: import("@prisma/client").$Enums.JobStatus;
        matchedCount: number;
        createdAt: Date;
    }>;
    private matchTradespersons;
    getJobs(homeownerId: string, query: GetJobsQueryDto): Promise<{
        data: {
            id: string;
            jobNumber: number;
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
    getJob(jobId: string, requesterId: string, requesterRole: string): Promise<{
        id: string;
        jobNumber: number;
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
    updateJobStatus(jobId: string, homeownerId: string, dto: UpdateJobStatusDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.JobStatus;
    }>;
}
