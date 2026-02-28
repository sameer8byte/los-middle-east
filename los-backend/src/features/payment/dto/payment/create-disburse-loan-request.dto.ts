import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateDisburseLoanRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID("4", { message: "loanId must be a valid UUID" })
  loanId: string;
}
