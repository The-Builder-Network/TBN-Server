import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { stripHtml } from '../../../common/sanitize.helper.js';
import { toBool, toInt, toTrimmed } from '../../../common/transforms.js';

const clean = ({ value }: { value: unknown }) => stripHtml(value);

export class UpdateProfileDto {
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(100)
  companyName?: string;

  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(100)
  trade?: string;

  @IsOptional()
  @Transform(toTrimmed)
  @IsString()
  @MaxLength(10)
  postcode?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(200)
  workRadiusMiles?: number;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  guarantee?: boolean;

  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(40)
  responseTime?: string;

  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(200)
  publicLiability?: string;

  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(200)
  employersLiability?: string;

  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(200)
  professionalIndemnity?: string;
}
