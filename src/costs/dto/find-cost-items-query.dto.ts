import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { CostCategory } from '../../common/enums/cost-category.enum';
import { CostType } from '../../common/enums/cost-type.enum';

export class FindCostItemsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  packageId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayId?: number;

  @IsOptional()
  @IsEnum(CostCategory)
  category?: CostCategory;

  @IsOptional()
  @IsEnum(CostType)
  costType?: CostType;
}
