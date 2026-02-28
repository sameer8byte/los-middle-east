import { IsString, IsOptional } from "class-validator";

export class CreateAlternatePhoneNumberDto {
  @IsString()
  userId: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  label?: string;
}
