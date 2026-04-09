import { IsOptional, IsString, IsInt, IsIn, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetQuestionsQueryDto {
  @IsOptional()
  @IsString()
  serviceSlug?: string;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsIn(['createdAt', 'answerCount'])
  sort?: 'createdAt' | 'answerCount' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  perPage?: number = 20;
}
