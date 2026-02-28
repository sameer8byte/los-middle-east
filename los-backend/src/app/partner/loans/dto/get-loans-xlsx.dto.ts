import { IsArray, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { LoanXlsxFileType } from "@prisma/client";

export class GetLoansXlsxDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  loanIds: string[];

  @IsString()
  @IsNotEmpty()
  brandId: string;

  @IsString()
  @IsNotEmpty()
  brandBankAccountId: string;

  @IsEnum(LoanXlsxFileType)
  fileType: LoanXlsxFileType;
}
