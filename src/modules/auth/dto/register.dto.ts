import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

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
}
