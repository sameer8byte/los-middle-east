import { IsUUID } from "class-validator";

export class GenerateLoanNoDueCertificateDto {
  @IsUUID()
  loanId: string;

  @IsUUID()
  brandId: string;
}
