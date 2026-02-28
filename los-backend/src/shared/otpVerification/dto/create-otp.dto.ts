import { IsUUID, IsString, IsDateString, Length } from "class-validator";

export class CreateOtpDto {
  @IsUUID()
  userId: string;

  @IsString()
  @Length(6, 6)
  otpCode: string;

  @IsString()
  type: string;

  @IsDateString()
  expiresAt: Date;
}
