import { IsEmail, IsUUID } from "class-validator";

export class SendEmailDto {
  @IsEmail()
  email: string;

  @IsUUID()
  brandId: string;

  @IsUUID()
  userId: string;
}
