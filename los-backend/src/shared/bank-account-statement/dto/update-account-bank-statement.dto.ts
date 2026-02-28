import { PartialType } from "@nestjs/mapped-types";
import { CreateBankAccountStatementDto } from "./create-account-bank-statement.dto";

export class UpdateBankAccountStatementDto extends PartialType(
  CreateBankAccountStatementDto,
) {}
