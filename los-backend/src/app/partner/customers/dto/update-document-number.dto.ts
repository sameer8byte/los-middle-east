import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { DocumentTypeEnum } from '@prisma/client';

export class UpdateDocumentNumberDto {
  @IsEnum(DocumentTypeEnum)
  @IsNotEmpty()
  documentType: DocumentTypeEnum;

  @IsString()
  @IsNotEmpty()
  @Matches(/^XXXXXXXX\d{4}$/, {
    message: 'Document number must be in format XXXXXXXX followed by 4 digits'
  })
  documentNumber: string;
}
