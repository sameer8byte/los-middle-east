import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreatePanAadhaarVerificationDto {
  @IsString()
  documentId: string;

  @IsString()
  requestId: string;

  @IsString()
  clientRefNum: string;

  @IsString()
  pan: string;

  @IsString()
  panType: string;

  @IsString()
  fullname: string;

  @IsString()
  firstName: string;

  @IsString()
  middleName: string;

  @IsString()
  lastName: string;

  @IsString()
  gender: string;

  @IsString()
  aadhaarNumber: string;

  @IsBoolean()
  aadhaarLinked: boolean;

  @IsDateString()
  dob: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  email?: string;

  httpResponseCode: number;
  resultCode: number;

  address: {
    buildingName: string;
    locality: string;
    streetName: string;
    pincode: string;
    city: string;
    state: string;
    country: string;
  };
}
