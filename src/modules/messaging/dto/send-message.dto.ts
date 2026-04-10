import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { stripHtml } from '../../../common/sanitize.helper.js';

export class SendMessageDto {
  @Transform(({ value }: { value: unknown }) => stripHtml(value))
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}
