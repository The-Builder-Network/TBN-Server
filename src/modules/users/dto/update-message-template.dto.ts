import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateMessageTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;
}
