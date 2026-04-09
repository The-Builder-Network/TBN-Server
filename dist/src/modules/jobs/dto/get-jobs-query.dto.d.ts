import { JobStatus } from '@prisma/client';
export declare class GetJobsQueryDto {
    status?: JobStatus;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    perPage?: number;
}
