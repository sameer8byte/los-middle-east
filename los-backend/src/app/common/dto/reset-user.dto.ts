import { IsEmail, IsString, IsUUID } from "class-validator";

export class ResetUserDto {
  @IsUUID()
  brandId: string;

  @IsEmail()
  email: string;
}
