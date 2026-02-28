import { IsString, IsOptional, IsUUID } from "class-validator";

export class GenerateAccessTokenDto {
  @IsUUID()
  userId: string;

  @IsString()
  partnerUserId: string;

  @IsUUID()
  @IsOptional()
  loanId?: string | null;
}
