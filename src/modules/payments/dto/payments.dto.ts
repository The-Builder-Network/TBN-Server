import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CREDIT_PACKS } from '../stripe.service.js';

const VALID_CREDIT_AMOUNTS = CREDIT_PACKS.map((p) => p.credits);

export class CreateCheckoutDto {
  @Type(() => Number)
  @IsInt()
  @IsIn(VALID_CREDIT_AMOUNTS, {
    message: `creditAmount must be one of: ${VALID_CREDIT_AMOUNTS.join(', ')}`,
  })
  creditAmount: number;
}

export class UpdateAutoTopupDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topupAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  topupThreshold?: number;
}
