import { IsString, IsUUID } from "class-validator";

export class PaytringStatusOrderDto {
  @IsUUID("4", { message: "loanId must be a valid UUID v4" })
  loanId: string;

  @IsString({ message: "externalRef must be a string" })
  externalRef: string;
}
