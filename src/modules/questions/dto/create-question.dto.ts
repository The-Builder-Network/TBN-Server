import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { stripHtml } from '../../../common/sanitize.helper.js';

export class CreateQuestionDto {
  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsString()
  serviceSlug?: string;
}
