import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsEnum(['HOMEOWNER', 'TRADESPERSON'])
  role: 'HOMEOWNER' | 'TRADESPERSON';

  @IsOptional()
  @IsString()
  phone?: string;
}
