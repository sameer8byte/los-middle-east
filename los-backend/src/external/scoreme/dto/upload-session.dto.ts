import { IsString, IsIn, IsOptional } from "class-validator";

export class UploadAccountStatementDto {
  @IsIn(["Trust"], { message: 'entityType must be "Trust"' })
  entityType: string;

  @IsString()
  bankCode: string;

  @IsIn(["SAVINGS", "CURRENT"], {
    message: "accountType must be either SAVINGS or CURRENT",
  })
  accountType: string;

  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsString()
  filePassword?: string;

  @IsString()
  bankStatementId: string;
}
