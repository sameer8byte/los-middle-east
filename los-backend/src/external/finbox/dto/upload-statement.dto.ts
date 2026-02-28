// src/bank-connect/dto/upload-statement.dto.ts
import { IsOptional, IsString } from "class-validator";

export class UploadStatementDto {
  @IsOptional()
  @IsString()
  file_url?: string;

  @IsString()
  bank_name: string;

  @IsString()
  session_id: string;

  @IsString()
  upload_type: string;

  @IsOptional()
  @IsString()
  pdf_password?: string;
}
