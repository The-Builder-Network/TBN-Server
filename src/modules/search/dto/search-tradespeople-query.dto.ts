import {
  IsOptional,
  IsString,
  IsInt,
  IsIn,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { toBool, toInt, toTrimmed } from '../../../common/transforms.js';

export class SearchTradespeopleQueryDto {
  @IsOptional()
  @Transform(toTrimmed)
  @IsString()
  @MaxLength(100)
  query?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceSlug?: string;

  /** Customer postcode: only trades whose work area covers it are returned. */
  @IsOptional()
  @Transform(toTrimmed)
  @IsString()
  @MaxLength(10)
  postcode?: string;

  /** Optional extra cap on distance from the postcode. */
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(200)
  radiusMiles?: number;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  guarantee?: boolean;

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

  @IsOptional()
  @IsIn(['rating', 'reviewCount', 'completedJobs', 'distance'])
  sort?: 'rating' | 'reviewCount' | 'completedJobs' | 'distance' = 'rating';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
