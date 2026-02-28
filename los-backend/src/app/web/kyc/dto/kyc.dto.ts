import {
  IsString,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsDate,
} from "class-validator";
import { DocumentTypeEnum } from "@prisma/client";
import { Type } from "class-transformer";

export class CreateKycDto {
  @IsEnum(DocumentTypeEnum)
  type: DocumentTypeEnum;

  @IsString()
  frontDocumentUrl: string;

  @IsString()
  backDocumentUrl: string;

  @IsString()
  documentNumber: string;
}

class DigitapDataDto {
  @IsString()
  otp?: string;

  @IsString()
  transactionId?: string;

  @IsString()
  codeVerifier?: string;

  @IsString()
  fwdp?: string;
}

export class VerifyAadharKycDto {
  @IsString()
  id: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @ValidateNested()
  @Type(() => DigitapDataDto)
  @IsOptional()
  providerData?: DigitapDataDto;

  @IsOptional()
  scoreMeData?: {
    otp: string;
    referenceId: string;
    responseCode: string;
    responseMessage: string;
  };
}

export class UpdateKyctDto {
  @IsEnum(DocumentTypeEnum)
  @IsOptional()
  type?: DocumentTypeEnum;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  fileType?: string;
}

export class UploadBankStatementDto {
  @IsString()
  fileUrl: string;

  @IsString()
  fileName: string;

  @Type(() => Date)
  @IsDate()
  fromDate: Date;

  @Type(() => Date)
  @IsDate()
  toDate: Date;

  @IsString()
  statementType: string;

  @IsOptional()
  @IsString()
  pdfPassword?: string;
}
