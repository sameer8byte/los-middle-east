import { AddressProofEnum, ResidenceTypeEnum } from "@prisma/client";
import { IsEnum, IsString } from "class-validator";

export class CreateUserDetailsDocumentProofDto {
  file: Express.Multer.File;

  @IsEnum(AddressProofEnum)
  addressProofType: AddressProofEnum;

  @IsString()
  userDetailsId: string;
}
export class CreateAlternateAddressDocumentProofDto {
  file: Express.Multer.File;

  @IsEnum(AddressProofEnum)
  addressProofType: AddressProofEnum;

  @IsString()
  alternateAddressId: string;

  @IsString()
  userId: string;

  @IsString()
  brandId: string;
}
