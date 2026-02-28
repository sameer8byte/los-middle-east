// dto/upsert-blocklist.dto.ts
import {
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  IsMobilePhone,
  Length,
} from "class-validator";

export class UpsertBlocklistDto {
  @IsString()
  @IsUUID()
  brandId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  dpd?: number;

  @IsOptional()
  @IsString()
  partnerUserName?: string;

  @IsOptional()
  @IsString()
  @Length(10, 10, { message: "Pancard must be 10 characters" })
  pancard?: string;

  @IsOptional()
  @IsMobilePhone("en-IN")
  mobile?: string;

  @IsOptional()
  @IsString()
  @Length(12, 12, { message: "Aadhar number must be 12 digits" })
  aadharNumber?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6, { message: "Pincode must be 6 digits" })
  pincode?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;
}
