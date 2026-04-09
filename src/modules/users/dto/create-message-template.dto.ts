import { IsString, MaxLength } from 'class-validator';

export class CreateMessageTemplateDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(2000)
  body!: string;
}
