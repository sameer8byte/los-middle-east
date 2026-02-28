import {
  IsString,
  IsNotEmpty,
  IsUUID,
  Matches,
  IsNumberString,
} from "class-validator";

export class SendSignupOtpV2Dto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/, {
    message:
      "Phone number must start with +91 followed by a valid 10-digit Indian mobile number.",
  })
  phoneNumber: string;

  @IsNotEmpty()
  @IsNumberString()
  occupationTypeId: string;

  @IsNotEmpty()
  @IsNumberString()
  monthlySalary: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message:
      "Invalid PAN card format. Format: 5 uppercase letters + 4 digits + 1 uppercase letter",
  })
  panCard: string;

  @IsNotEmpty()
  @IsUUID()
  brandId: string;

  @IsNotEmpty()
  @IsString()
  domain: string;
}
