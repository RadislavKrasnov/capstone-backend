import { Type } from 'class-transformer';
import {
  IsBoolean,
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

import { CostCategory } from '../../common/enums/cost-category.enum';
import { CostType } from '../../common/enums/cost-type.enum';

export class CreateCostItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  packageId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itineraryItemId?: number | null;

  @IsEnum(CostCategory)
  category: CostCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(CostType)
  costType: CostType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
