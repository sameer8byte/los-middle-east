import { BrandProviderType, BrandProviderName } from "@prisma/client";
import { IsEnum, IsOptional, IsBoolean } from "class-validator";

export class UpdateBrandProviderDto {
  @IsOptional()
  @IsEnum(BrandProviderType)
  type?: BrandProviderType;

  @IsOptional()
  @IsEnum(BrandProviderName)
  provider?: BrandProviderName;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
