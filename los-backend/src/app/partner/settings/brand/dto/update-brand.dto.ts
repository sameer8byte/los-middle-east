// src/brand/dto/update-brand.dto.ts

import { IsEnum, IsNotEmpty, IsString, IsUrl } from "class-validator";
import { LoanRiskCategory } from "@prisma/client"; // Adjust import if enum is elsewhere

export class UpdateBrandDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl()
  logoUrl?: string;

  // @IsString()
  // @IsNotEmpty()
  // domain: string;

  @IsEnum(LoanRiskCategory)
  defaultLoanRiskCategory: LoanRiskCategory;
}
