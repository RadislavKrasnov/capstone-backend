import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdatePackageHighlightDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  packageId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  text?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  displayOrder?: number;
}
