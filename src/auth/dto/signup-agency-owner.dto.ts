import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SignupAgencyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(180)
  slug: string;

  @IsOptional()
  @IsPhoneNumber()
  @MaxLength(30)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}

export class SignupAgencyOwnerDto {
  @ValidateNested()
  @Type(() => SignupAgencyDto)
  agency: SignupAgencyDto;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(80)
  username: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsPhoneNumber()
  @MaxLength(30)
  phoneNumber?: string;
}
