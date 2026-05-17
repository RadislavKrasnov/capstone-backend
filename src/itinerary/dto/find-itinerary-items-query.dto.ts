import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { ItineraryItemType } from '../../common/enums/itinerary-item-type.enum';

export class FindItineraryItemsQueryDto {
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
  dayId?: number;

  @IsOptional()
  @IsEnum(ItineraryItemType)
  type?: ItineraryItemType;
}
