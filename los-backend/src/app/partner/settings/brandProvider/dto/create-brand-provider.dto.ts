import { BrandProviderType, BrandProviderName } from "@prisma/client";
import { IsEnum, IsOptional, IsBoolean } from "class-validator";

export class CreateBrandProviderDto {
  @IsEnum(BrandProviderType)
  type: BrandProviderType;

  @IsEnum(BrandProviderName)
  provider: BrandProviderName;

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
