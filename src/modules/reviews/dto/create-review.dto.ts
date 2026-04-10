import {
  IsString,
  IsInt,
  IsUUID,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { stripHtml } from '../../../common/sanitize.helper.js';

export class CreateReviewDto {
  @IsUUID()
  jobId!: string;

  @IsUUID()
  tradespersonId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  comment!: string;
}
