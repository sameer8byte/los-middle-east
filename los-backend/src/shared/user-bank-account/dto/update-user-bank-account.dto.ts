import { PartialType } from "@nestjs/mapped-types";
import { CreateUserBankAccountDto } from "./create-user-bank-account.dto";

export class UpdateUserBankAccountDto extends PartialType(
  CreateUserBankAccountDto,
) {}
