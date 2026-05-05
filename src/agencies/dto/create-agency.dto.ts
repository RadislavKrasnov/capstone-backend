import { IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAgencyDto {
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
