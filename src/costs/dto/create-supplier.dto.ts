import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { SupplierType } from '../../common/enums/supplier-type.enum';

export class CreateSupplierDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  agencyId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsEnum(SupplierType)
  type?: SupplierType | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactPhone?: string | null;
}
