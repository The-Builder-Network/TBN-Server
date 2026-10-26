import {
  IsOptional,
  IsString,
  IsInt,
  IsIn,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { toInt } from '../../../common/transforms.js';

export class GetQuestionsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceSlug?: string;

  /** A user id, or "mine" for the signed-in user's questions. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  authorId?: string;

  @IsOptional()
  @IsIn(['createdAt', 'answerCount'])
  sort?: 'createdAt' | 'answerCount' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(50)
  perPage?: number = 20;
}
