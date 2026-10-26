import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { toInt, toTrimmed } from '../../../common/transforms.js';

export class AdminPageQueryDto {
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 25;

  /** Free-text filter (name, email, username, job title …). */
  @IsOptional()
  @Transform(toTrimmed)
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsIn(['HOMEOWNER', 'TRADESPERSON', 'ADMIN'])
  role?: 'HOMEOWNER' | 'TRADESPERSON' | 'ADMIN';
}

/** Required note shown to the user (rejection reason, info needed, suspension reason). */
export class AdminNoteDto {
  @Transform(toTrimmed)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  note!: string;
}

export class OptionalNoteDto {
  @IsOptional()
  @Transform(toTrimmed)
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CreditAdjustmentDto {
  /** Positive to credit, negative to debit. */
  @Transform(toInt)
  @IsInt()
  @NotEquals(0)
  @Min(-10000)
  @Max(10000)
  amount!: number;

  @Transform(toTrimmed)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note!: string;
}

export class LeadFeeDto {
  @Transform(toInt)
  @IsInt()
  @Min(0)
  @Max(500)
  leadFeeCredits!: number;
}
