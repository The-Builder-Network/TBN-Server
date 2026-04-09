import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ExpressInterestDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quoteAmountPence?: number;
}
