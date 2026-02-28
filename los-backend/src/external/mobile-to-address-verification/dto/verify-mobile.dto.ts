import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
} from "class-validator";

export class VerifyMobileBaseDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  brandId: string;

  @IsString()
  @IsOptional()
  checkId?: string;

  @IsString()
  @IsOptional()
  groupId?: string;
}

export class VerifyMobileDto extends VerifyMobileBaseDto {
  // Inherits userId and brandId as required fields
}

export class VerifyMobileWithServiceDto extends VerifyMobileBaseDto {
  @IsEnum(['MOBILE_TO_ADDRESSES', 'MOBILE_TO_ADDRESSES_ECOM', 'MOBILE_TO_LPG_DETAILS', 'MOBILE_TO_DL_ADVANCED'])
  @IsNotEmpty()
  serviceType: 'MOBILE_TO_ADDRESSES' | 'MOBILE_TO_ADDRESSES_ECOM' | 'MOBILE_TO_LPG_DETAILS' | 'MOBILE_TO_DL_ADVANCED';
}

export class VerifyMobileBatchDto extends VerifyMobileBaseDto {
  // Inherits userId and brandId from base
}






