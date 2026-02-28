// dto/verify-otp.dto.ts
import { IsString, IsEnum } from "class-validator";

export enum VerificationType {
  EMAIL = "email",
  PHONE = "phone",
}

export enum VerificationAction {
  SIGNUP = "signup",
  SIGNIN = "signin",
}

export class VerifyOtpDto {
  @IsString()
  otp: string;

  @IsString()
  brandId: string;

  @IsString()
  userId: string;

  @IsEnum(VerificationType)
  type: VerificationType;

  @IsString()
  deviceId: string;
}
