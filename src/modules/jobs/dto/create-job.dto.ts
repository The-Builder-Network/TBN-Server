import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { stripHtml } from '../../../common/sanitize.helper.js';

export class CreateJobDto {
  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(70)
  title!: string;

  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  serviceSlug!: string;

  @IsOptional()
  @IsString()
  tradeSlug?: string;

  @IsString()
  @IsNotEmpty()
  postcode!: string;

  /**
   * Dynamic question-tree answers.
   * Sent as JSON string in multipart form; transform parses it.
   */
  @IsOptional()
  @IsObject()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return value;
      }
    }
    return value;
  })
  answersJson?: Record<string, unknown>;
}
