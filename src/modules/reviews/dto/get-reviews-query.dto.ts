import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { toInt } from '../../../common/transforms.js';

export class GetReviewsQueryDto {
  @IsString()
  @MaxLength(40)
  tradespersonId!: string;

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
  perPage?: number = 10;
}
