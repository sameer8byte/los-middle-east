import { BrandBankAccountType } from "@prisma/client";
import { IsString, IsOptional, IsBoolean, IsEnum } from "class-validator";

export class UpdateBrandBankAccountDto {
  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsString()
  upiId?: string;

  @IsOptional()
  @IsBoolean()
  isPrimaryAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // enum
  @IsOptional()
  @IsEnum(BrandBankAccountType)
  type: BrandBankAccountType;
}
