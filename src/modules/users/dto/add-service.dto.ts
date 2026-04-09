import { IsString, IsOptional, MaxLength } from 'class-validator';

export class AddServiceDto {
  @IsString()
  @MaxLength(100)
  serviceSlug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tradeSlug?: string;
}
