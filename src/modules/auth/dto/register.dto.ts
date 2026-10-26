import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { toBool, toEmail, toTrimmed } from '../../../common/transforms.js';

export class RegisterDto {
  @Transform(toEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @Transform(toTrimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(['HOMEOWNER', 'TRADESPERSON'])
  role!: 'HOMEOWNER' | 'TRADESPERSON';

  @IsOptional()
  @IsString()
  @Matches(/^\+44[1-9]\d{9}$/, {
    message: 'Phone must be a valid UK number (e.g. +447911123456)',
  })
  phone?: string;

  /** Optional marketing consent (never required to create an account). */
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  marketingOptIn?: boolean;
}
