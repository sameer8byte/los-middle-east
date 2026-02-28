import { IsString } from "class-validator";

export class SendNoDueCertificateEmailDto {
  @IsString()
  loanId: string;
}
