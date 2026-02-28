import { IsOptional, IsBoolean } from "class-validator";
import { CreateNonRepaymentDateDto } from "./create-non-repayment-date.dto";

export class UpdateNonRepaymentDateDto extends CreateNonRepaymentDateDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
