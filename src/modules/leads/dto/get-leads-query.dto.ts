import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CreditRequestReason } from '@prisma/client';
import { toInt } from '../../../common/transforms.js';

export const LEAD_TABS = [
  'new',
  'interested',
  'shortlisted',
  'hired',
  'archived',
] as const;
export type LeadTab = (typeof LEAD_TABS)[number];

export class GetLeadsQueryDto {
  @IsOptional()
  @IsIn(LEAD_TABS)
  tab?: LeadTab = 'new';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceSlug?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(200)
  maxDistanceMiles?: number;

  @IsOptional()
  @IsIn(['createdAt', 'distanceMiles', 'creditCost'])
  sort?: 'createdAt' | 'distanceMiles' | 'creditCost';

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
  perPage?: number = 20;
}

export class LeadsCountQueryDto {
  @IsString()
  @MaxLength(10)
  postcode!: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(200)
  radius?: number = 25;

  /** Comma-separated service slugs to count (defaults to all services). */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  services?: string;
}

export class CreditRequestDto {
  @IsEnum(CreditRequestReason)
  reason!: CreditRequestReason;

  @IsString()
  @MaxLength(2000)
  details!: string;
}
