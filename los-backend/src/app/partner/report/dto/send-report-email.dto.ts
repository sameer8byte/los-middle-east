import { IsEmail, IsOptional, IsString } from "class-validator";

export class SendReportEmailDto {
  @IsEmail()
  recipientEmail: string;

  @IsOptional()
  @IsString()
  recipientName?: string;
}
