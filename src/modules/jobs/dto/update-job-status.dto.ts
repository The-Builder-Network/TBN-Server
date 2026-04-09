import { IsEnum } from 'class-validator';
import { JobStatus } from '@prisma/client';

export class UpdateJobStatusDto {
  @IsEnum(['CANCELLED', 'CLOSED'])
  status!: Extract<JobStatus, 'CANCELLED' | 'CLOSED'>;
}
