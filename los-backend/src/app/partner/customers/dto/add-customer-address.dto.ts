import { IsString, IsEnum, IsOptional, IsBoolean } from "class-validator";
import { AddressProofEnum } from "@prisma/client";

export class AddCustomerAddressDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  pincode: string;

  @IsString()
  country: string;

  @IsEnum(AddressProofEnum)
  addressProofType: AddressProofEnum;

  @IsOptional()
  @IsString()
  filePrivateKey?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;

  @IsString()
  remarks: string;
}
