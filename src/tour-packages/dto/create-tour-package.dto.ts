import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { PackageStatus } from '../../common/enums/package-status.enum';

export class CreateTourPackageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  agencyId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  destinationCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  destinationCity?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedGroupSize: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  sellingPricePerPerson: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;

  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
