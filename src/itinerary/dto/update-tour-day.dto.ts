import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateTourDayDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  packageId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayNumber?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isRestDay?: boolean;
}
