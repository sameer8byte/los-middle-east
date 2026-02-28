import { IsUUID, IsString, IsOptional } from "class-validator";

export class SendBackToCeDto {
  @IsUUID()
  loanId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  comments: string;
}
