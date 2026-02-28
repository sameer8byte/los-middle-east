import { IsUUID, IsOptional } from "class-validator";

export class ForceBypassReportsDto {
  @IsUUID()
  loanId: string;

  // reason
  @IsOptional()
  reason?: string;  
  
}
