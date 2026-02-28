import { BrandBankAccountType } from "@prisma/client";
import { IsString, IsOptional, IsBoolean, IsEnum } from "class-validator";

export class CreateBrandBankAccountDto {
  @IsString()
  bankName: string;

  @IsString()
  accountNumber: string;

  @IsString()
  ifscCode: string;

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
