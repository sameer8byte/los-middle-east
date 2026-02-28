import { IsString, IsIn, IsNotEmpty } from "class-validator";

export class SendBackToCeSmDto {
  @IsNotEmpty()
  @IsString()
  loanId: string;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsNotEmpty()
  @IsIn(['CREDIT_MANAGER', 'SM_SH'])
  targetRole: 'CREDIT_MANAGER' | 'SM_SH';
}