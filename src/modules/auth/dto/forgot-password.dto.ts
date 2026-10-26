import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { toEmail } from '../../../common/transforms.js';

export class ForgotPasswordDto {
  @Transform(toEmail)
  @IsEmail()
  email!: string;
}
