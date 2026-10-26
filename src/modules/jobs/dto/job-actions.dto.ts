import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { stripHtml } from '../../../common/sanitize.helper.js';

export class UpdateJobDto {
  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description!: string;
}

export class CloseJobDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class DeclineLeadDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class InviteTradespersonDto {
  @IsString()
  @MaxLength(100)
  username!: string;
}
