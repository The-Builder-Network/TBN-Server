import {
  IsString,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { stripHtml } from '../../../common/sanitize.helper.js';
import { toInt } from '../../../common/transforms.js';

export class CreateReviewDto {
  @IsString()
  @MaxLength(40)
  jobId!: string;

  @IsString()
  @MaxLength(40)
  tradespersonId!: string;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @MinLength(20, { message: 'Please write at least 20 characters' })
  @MaxLength(2000)
  comment!: string;
}

export class UpdateReviewDto {
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @MinLength(20, { message: 'Please write at least 20 characters' })
  @MaxLength(2000)
  comment?: string;
}
