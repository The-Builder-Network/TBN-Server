import type { JwtPayload } from '../auth/auth.service.js';
import { JobsService } from './jobs.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { GetJobsQueryDto } from './dto/get-jobs-query.dto.js';
import { UpdateJobStatusDto } from './dto/update-job-status.dto.js';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    createJob(user: JwtPayload, dto: CreateJobDto, attachments?: Express.Multer.File[]): Promise<{
        id: any;
        jobNumber: any;
        status: any;
        matchedCount: number;
        createdAt: any;
    }>;
    getJobs(user: JwtPayload, query: GetJobsQueryDto): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    getJob(user: JwtPayload, id: string): Promise<{
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
    updateJobStatus(user: JwtPayload, id: string, dto: UpdateJobStatusDto): Promise<{
        id: any;
        status: any;
    }>;
}
