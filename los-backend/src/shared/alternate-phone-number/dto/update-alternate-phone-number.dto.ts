import { PartialType } from "@nestjs/mapped-types";
import { CreateAlternatePhoneNumberDto } from "./create-alternate-phone-number.dto";

export class UpdateAlternatePhoneNumberDto extends PartialType(
  CreateAlternatePhoneNumberDto,
) {}
