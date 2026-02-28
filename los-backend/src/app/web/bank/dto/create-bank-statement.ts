import { PartialType } from "@nestjs/mapped-types";
import { IsString, IsOptional, IsDateString } from "class-validator";

export class CreateBankAccountStatementDto {
  @IsString()
  brandId: string;

  @IsString()
  userId: string;

  @IsString()
  userBankAccountId: string;

  @IsOptional()
  @IsString()
  statementType?: string;

  @IsOptional()
  @IsDateString()
  fromDate: Date;

  @IsOptional()
  @IsDateString()
  toDate: Date;

  @IsOptional()
  @IsString()
  filePassword: string;
}

export class UpdateBankAccountStatementDto extends PartialType(
  CreateBankAccountStatementDto,
) {}
