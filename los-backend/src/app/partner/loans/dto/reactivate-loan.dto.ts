import { IsUUID, IsString } from "class-validator";

export class ReactivateLoanDto {
  @IsUUID()
  loanId: string;

  @IsString()
  reason: string;
}
