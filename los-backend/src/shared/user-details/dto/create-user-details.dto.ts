// src/user-details/dto/create-user-details.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsNumber,
} from "class-validator";
import {
  AddressProofEnum,
  gender_enum,
  marital_status_enum,
  ReligionEnum,
  ResidenceTypeEnum,
} from "@prisma/client";
import { Res } from "@nestjs/common";

export class CreateUserDetailsDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(gender_enum)
  @IsOptional()
  gender?: gender_enum;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  profilePicUrl?: string;

  @IsOptional()
  @IsString()
  profileVideoUrl?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsEnum(marital_status_enum)
  @IsOptional()
  maritalStatus?: marital_status_enum;

  @IsEnum(ReligionEnum)
  @IsOptional()
  religion?: ReligionEnum;

  @IsOptional()
  @IsString()
  spouseName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsBoolean()
  isCommunicationAddress?: boolean;

  @IsOptional()
  @IsString()
  fathersName?: string;

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
  @IsNumber()
  geoLatitude?: number;

  @IsOptional()
  @IsNumber()
  geoLongitude?: number;
}
