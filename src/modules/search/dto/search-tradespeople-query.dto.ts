import {
  IsOptional,
  IsString,
  IsInt,
  IsIn,
  IsBoolean,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchTradespeopleQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  serviceSlug?: string;

  @IsOptional()
  @IsString()
  postcode?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  radiusMiles?: number;

  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  guarantee?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  perPage?: number = 20;

  @IsOptional()
  @IsIn(['rating', 'reviewCount', 'completedJobs'])
  sort?: 'rating' | 'reviewCount' | 'completedJobs' = 'rating';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
