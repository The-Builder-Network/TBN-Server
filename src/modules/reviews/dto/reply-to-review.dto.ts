import { IsString, MinLength, MaxLength } from 'class-validator';

export class ReplyToReviewDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  body!: string;
}
