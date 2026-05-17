import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { ItineraryIntensity } from '../../common/enums/itinerary-intensity.enum';
import { ItineraryItemType } from '../../common/enums/itinerary-item-type.enum';

export class UpdateItineraryItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemOrder?: number;

  @IsOptional()
  @IsEnum(ItineraryItemType)
  type?: ItineraryItemType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  startTime?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  endTime?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  startLocation?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  endLocation?: string | null;

  @IsOptional()
  @IsEnum(ItineraryIntensity)
  intensity?: ItineraryIntensity | null;

  @IsOptional()
  @IsBoolean()
  isMajorActivity?: boolean;
}
