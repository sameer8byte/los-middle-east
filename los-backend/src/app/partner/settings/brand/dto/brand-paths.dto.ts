import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BrandPathOrderItem {
  @IsString()
  id: string;

  @IsNumber()
  sortIndex: number;
}

export class CreateBrandPathDto {
  @IsString()
  path: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;

  @IsOptional()
  @IsNumber()
  sortIndex?: number;
}

export class UpdateBrandPathDto {
  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;

  @IsOptional()
  @IsNumber()
  sortIndex?: number;
}

export class UpdateBrandPathsOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrandPathOrderItem)
  paths: BrandPathOrderItem[];
}
