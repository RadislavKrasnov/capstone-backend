import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAnalysisConfigurationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  agencyId?: number | null;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  minTargetMarginPercent: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  goodMarginPercent: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  maxDailyFatigueScore: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxTransferMinutesPerDay: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  minBufferMinutes: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}
