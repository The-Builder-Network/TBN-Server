import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { JobStatus } from '@prisma/client';

export class GetJobsQueryDto {
  @IsOptional()
  @IsString()
  status?: JobStatus;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 10;
}
