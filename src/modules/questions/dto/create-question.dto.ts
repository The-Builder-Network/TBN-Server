import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsString()
  serviceSlug?: string;
}
