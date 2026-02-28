import { IsNotEmpty, IsString, IsEmail, IsEnum } from 'class-validator';
import { EmailType } from '../enums/email-type.enum';

export class SendTestEmailDto {
  @IsNotEmpty()
  @IsString()
  loanId: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsEnum(EmailType)
  emailType: EmailType;
}
