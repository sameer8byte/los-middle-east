import { OtherDocumentTypeEnum } from "@prisma/client";
import { IsUUID, IsEnum, IsString, IsOptional } from "class-validator";

export class UpsertDocumentUploadDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  userId: string;

  @IsEnum(OtherDocumentTypeEnum)
  documentType: OtherDocumentTypeEnum;

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
