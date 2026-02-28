import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  Length,
  ValidateIf,
  Matches,
} from "class-validator";

export class PublicLoanInquiryInitiateDto {
  @ValidateIf((o) => !o.pan)
  @IsNotEmpty({ message: "Either mobile or PAN is required" })
  @Matches(/^\+91[6-9]\d{9}$/, { 
    message: "Mobile number must be in format +916666666666 (with country code +91)" 
  })
  @IsOptional()
  mobile?: string;

  @ValidateIf((o) => !o.mobile)
  @IsNotEmpty({ message: "Either mobile or PAN is required" })
  @IsString()
  @Length(10, 10, { message: "PAN must be exactly 10 characters" })
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: "PAN must be in valid format (e.g., ABCDE1234F)"
  })
  @IsOptional()
  pan?: string;
}

export class PublicLoanInquiryVerifyDto {
  @IsString()
  @IsNotEmpty({ message: "Mobile or PAN is required" })
  identifier: string; // Either mobile or PAN

  @IsString()
  @IsNotEmpty({ message: "OTP is required" })
  @Length(6, 6, { message: "OTP must be exactly 6 digits" })
  otp: string;

  @IsString()
  @IsNotEmpty({ message: "Verification session ID is required" })
  publicLoanInquiriesId: string;
}
