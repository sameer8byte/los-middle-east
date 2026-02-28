import { rejection_type_enum, brand_status_enum } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBrandStatusReasonDto {
  @IsString()
  @IsNotEmpty()
  brandId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsEnum(rejection_type_enum)
  type: rejection_type_enum;

  @IsEnum(brand_status_enum)
  @IsOptional()
  status?: brand_status_enum;

  @IsOptional()
  isDisabled?: boolean;

  @IsOptional()
  isActive?: boolean;
}
