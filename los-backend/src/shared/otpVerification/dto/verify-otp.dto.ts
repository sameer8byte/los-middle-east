import { IsUUID, IsString, Length } from "class-validator";

export class VerifyOtpDto {
  @IsUUID()
  userId: string;

  @IsString()
  @Length(6, 6)
  otpCode: string;

  @IsString()
  type: string;
}
