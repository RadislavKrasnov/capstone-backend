import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

import { UserRole } from '../../users/entities/user.entity';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsInt()
  agencyId: number;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
