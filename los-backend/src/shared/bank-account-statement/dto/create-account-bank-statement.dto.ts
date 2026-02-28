import { IsString, IsOptional, IsDateString } from "class-validator";

export class CreateBankAccountStatementDto {
  @IsString()
  userId: string;

  @IsString()
  userBankAccountId: string;

  @IsString()
  filePrivateKey: string;

  @IsOptional()
  @IsDateString()
  fromDate?: Date;

  @IsOptional()
  @IsDateString()
  toDate?: Date;

  @IsOptional()
  @IsString()
  filePassword?: string;
}
