import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { stripHtml } from '../../../common/sanitize.helper.js';
import { toInt } from '../../../common/transforms.js';

const clean = ({ value }: { value: unknown }) => stripHtml(value);

export class ExpressInterestDto {
  @Transform(clean)
  @IsString()
  @MinLength(10, {
    message: 'Please write a short introduction (at least 10 characters)',
  })
  @MaxLength(2000)
  message!: string;

  /** Optional ballpark estimate shown to the homeowner. */
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(100)
  @Max(100_000_000)
  quoteAmountPence?: number;

  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(100)
  estimateRange?: string;
}

export class QuoteDto {
  @Transform(clean)
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(100)
  @Max(100_000_000)
  amountPence?: number;

  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(100)
  estimateRange?: string;
}
