import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
} from "class-validator";
import { loan_status_enum, LoanRiskCategory } from "@prisma/client";

export class UpdateLoanStatusDto {
  @IsUUID()
  loanId: string;

  @IsEnum(loan_status_enum)
  status: loan_status_enum;

  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  approvedLoanAmount?: number;

  @IsOptional()
  @IsString()
  approvedDueDate?: string | null;

  @IsOptional()
  @IsString()
  disbursementDate?: Date | null;

  @IsOptional()
  isPermanentlyBlocked?: boolean = false;

  @IsOptional()
  @IsEnum(LoanRiskCategory)
  ruleType?: LoanRiskCategory;
}
