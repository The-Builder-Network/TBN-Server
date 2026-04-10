import { IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { stripHtml } from '../../../common/sanitize.helper.js';

export class CreateAnswerDto {
  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  body!: string;
}
