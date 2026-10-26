import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { toEmail } from '../../../common/transforms.js';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}

export class CheckEmailDto {
  @Transform(toEmail)
  @IsEmail()
  email!: string;
}

export class CheckPhoneDto {
  @IsString()
  @Matches(/^\+44[1-9]\d{9}$/)
  phone!: string;
}
