import { IsString, Length } from "class-validator";

export class VerifyAlternatePhoneNumberDto {
  @IsString()
  @Length(6, 6)
  otp: string;
}
