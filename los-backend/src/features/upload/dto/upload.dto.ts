// src/upload/dto/upload-document.dto.ts
import { IsNotEmpty, IsString } from "class-validator";
export class UploadDocumentDto {
  @IsNotEmpty()
  @IsString()
  documentType: string;

  // brandId
  @IsNotEmpty()
  @IsString()
  brandId: string;

  @IsNotEmpty()
  userId: string;
}

export class UploadPublicDocumentDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  brandId: string;
}
