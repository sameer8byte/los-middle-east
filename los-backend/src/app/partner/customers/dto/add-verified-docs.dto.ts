import { DocumentTypeEnum } from "@prisma/client";
import { IsUUID, IsEnum, IsString, IsOptional } from "class-validator";

export class CreateVerifiedDocumentUploadDto {
  @IsUUID()
  userId: string;

  @IsEnum(DocumentTypeEnum)
  documentType: DocumentTypeEnum;

  @IsString()
  documentNumber: string;

  @IsOptional()
  @IsString()
  verificationNotes?: string;

  @IsOptional()
  @IsString()
  frontPassword?: string;

  @IsOptional()
  @IsString()
  backPassword?: string;
}
