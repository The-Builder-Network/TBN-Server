import { JobStatus } from '@prisma/client';
export declare class UpdateJobStatusDto {
    status: Extract<JobStatus, 'CANCELLED' | 'CLOSED'>;
}
