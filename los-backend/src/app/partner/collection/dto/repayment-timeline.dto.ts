// repayment-timeline.dto.ts
import { IsUUID, IsOptional, IsString } from "class-validator";

export class CreateRepaymentTimelineDto {
  @IsUUID()
  loanId: string;

  @IsUUID()
  partnerUserId: string;

  //callId
  @IsOptional()
  @IsString()
  callId?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateRepaymentTimelineDto {
  @IsUUID()
  id: string; // Required

  @IsOptional()
  @IsUUID()
  loanId?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
