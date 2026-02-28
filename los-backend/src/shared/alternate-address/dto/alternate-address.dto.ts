// src/alternate-address/dto/create-alternate-address.dto.ts
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ResidenceTypeEnum, AddressProofEnum } from "@prisma/client";

export class CreateAlternateAddressDto {
  @IsString()
  userId: string;

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

  @IsEnum(ResidenceTypeEnum)
  @IsOptional()
  residenceType?: ResidenceTypeEnum;

  @IsEnum(AddressProofEnum)
  @IsOptional()
  addressProofType?: AddressProofEnum;

  @IsOptional()
  @IsString()
  filePrivateKey?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
