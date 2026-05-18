import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePackageHighlightDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  packageId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  text: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  displayOrder: number;
}
