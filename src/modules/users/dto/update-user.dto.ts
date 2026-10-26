import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { toBool, toTrimmed } from '../../../common/transforms.js';

export class UpdateUserDto {
  @IsOptional()
  @Transform(toTrimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+44[1-9]\d{9}$/, {
    message: 'Phone must be a valid UK number (e.g. +447911123456)',
  })
  phone?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  marketingOptIn?: boolean;
}

export class NotificationsPausedDto {
  @Transform(toBool)
  @IsBoolean()
  paused!: boolean;
}

export class DeleteAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
