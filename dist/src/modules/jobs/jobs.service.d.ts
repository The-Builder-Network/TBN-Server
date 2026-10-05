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
        id: any;
        jobNumber: any;
        status: any;
        matchedCount: number;
        createdAt: any;
    }>;
    backfillLeadsForTradesperson(tradespersonId: string): Promise<void>;
    private matchTradespersons;
    getJobs(homeownerId: string, query: GetJobsQueryDto): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    getJob(jobId: string, requesterId: string, requesterRole: string): Promise<{
        id: any;
        jobNumber: any;
        title: any;
        description: any;
        serviceSlug: any;
        postcode: any;
        placeName: any;
        status: any;
        answersJson: any;
        createdAt: any;
        attachments: any;
        responses: any;
    }>;
    updateJobStatus(jobId: string, homeownerId: string, dto: UpdateJobStatusDto): Promise<{
        id: any;
        status: any;
    }>;
}
