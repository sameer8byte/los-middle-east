import { IsNotEmpty, IsUUID } from "class-validator";

export class UpsertClosingTypeDto {
  @IsUUID()
  @IsNotEmpty()
  loanId: string;
}
