import { IsString, IsInt, IsBoolean, IsOptional, MaxLength, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  trade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postcode?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  @Max(200)
  workRadiusMiles?: number;

  @IsOptional()
  @IsBoolean()
  guarantee?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  responseTime?: string;
}
