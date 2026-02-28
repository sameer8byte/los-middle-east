import { IsEnum, IsString } from "class-validator";
import { LoanRiskCategory } from "@prisma/client";

export class ChangeLoanRuleTypeDto {
  @IsEnum(LoanRiskCategory)
  ruleType: LoanRiskCategory;

  @IsString()
  reason: string;
}
