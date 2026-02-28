import { IsString, IsOptional, IsEnum, IsBoolean } from "class-validator";
import { document_status_enum, DocumentTypeEnum } from "@prisma/client";

export class CreateDocumentDto {
  @IsEnum(DocumentTypeEnum)
  type: DocumentTypeEnum;

  @IsString()
  frontDocumentUrl: string;

  @IsString()
  backDocumentUrl: string;

  @IsString()
  documentNumber: string;

  @IsString()
  userId: string;
}

export class UpdateDocumentDto {
  @IsEnum(DocumentTypeEnum)
  @IsOptional()
  type?: DocumentTypeEnum;

  @IsEnum(document_status_enum)
  @IsOptional()
  status?: document_status_enum;

  @IsString()
  @IsOptional()
  frontDocumentUrl?: string;

  @IsString()
  @IsOptional()
  backDocumentUrl?: string;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsBoolean()
  @IsOptional()
  isApprovedByAdmin?: boolean;

  @IsString()
  @IsOptional()
  verificationNotes?: string;

  @IsString()
  @IsOptional()
  frontPassword?: string;

  @IsString()
  @IsOptional()
  backPassword?: string;
}

export class VerifyDocumentDto {
  @IsEnum(DocumentTypeEnum)
  type: DocumentTypeEnum;

  @IsString()
  @IsOptional()
  otp?: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsEnum(document_status_enum)
  status: document_status_enum;

  @IsString()
  @IsOptional()
  notes?: string;
}
