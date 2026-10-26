import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { CREDIT_PACKS } from '../stripe.service.js';
import { toInt } from '../../../common/transforms.js';

const VALID_CREDIT_AMOUNTS = CREDIT_PACKS.map((p) => p.credits);

export class CreateCheckoutDto {
  @Transform(toInt)
  @IsInt()
  @IsIn(VALID_CREDIT_AMOUNTS, {
    message: `creditAmount must be one of: ${VALID_CREDIT_AMOUNTS.join(', ')}`,
  })
  creditAmount!: number;
}

export class PageQueryDto {
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
