import { IsOptional, IsInt, Min, Max, IsEnum, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { JobStatus } from '@prisma/client';
import { toInt } from '../../../common/transforms.js';

export class GetJobsQueryDto {
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  /** Shortcut filters for the "My jobs" tabs. */
  @IsOptional()
  @IsIn(['open', 'closed'])
  view?: 'open' | 'closed';

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt'])
  sort?: 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(50)
  perPage?: number = 10;
}
