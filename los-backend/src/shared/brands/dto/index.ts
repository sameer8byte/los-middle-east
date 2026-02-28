import { IsString, IsOptional, IsBoolean, IsNumber } from "class-validator";
import { DocumentTypeEnum } from "@prisma/client";
export class CreateBrandDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  domain?: string;
}

export class UpdateBrandDto extends CreateBrandDto {}

export class CreateDocumentRuleDto {
  @IsString()
  type: DocumentTypeEnum;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsNumber()
  maxUploadCount?: number;
}

export class CreateLoanRuleDto {
  @IsString()
  ruleType: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
