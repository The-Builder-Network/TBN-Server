import { IsString, IsInt, IsUUID, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  jobId!: string;

  @IsUUID()
  tradespersonId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  comment!: string;
}
