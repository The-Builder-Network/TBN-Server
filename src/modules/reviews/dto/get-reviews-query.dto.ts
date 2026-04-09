import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetReviewsQueryDto {
  @IsString()
  tradespersonId!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  perPage?: number = 10;
}
