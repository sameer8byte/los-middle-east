// src/alternate-address/dto/update-alternate-address.dto.ts
import { PartialType } from "@nestjs/mapped-types";
import { CreateAlternateAddressDto } from "./alternate-address.dto";

export class UpdateAlternateAddressDto extends PartialType(
  CreateAlternateAddressDto,
) {}
