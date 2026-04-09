import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateAnswerDto {
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  body!: string;
}
