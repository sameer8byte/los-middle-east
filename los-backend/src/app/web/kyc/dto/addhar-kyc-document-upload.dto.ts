import { IsUUID, IsEnum, IsString, IsIn } from "class-validator";
import { DocumentTypeEnum } from "@prisma/client"; // adjust path as needed

export class CreateAddharKycDocumentUploadDto {
  @IsUUID()
  userId: string;

  @IsEnum(DocumentTypeEnum)
  documentType: DocumentTypeEnum;

  @IsString()
  documentNumber: string;

  @IsIn(["front", "back"])
  side: "front" | "back";

  file: any; // multer handles file validation separately
}
