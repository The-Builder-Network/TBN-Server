import { IsString, IsInt, IsOptional, MaxLength, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddQualificationDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;
}
