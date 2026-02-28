import { IsNotEmpty, IsString, IsNumber, IsPositive, IsDate, IsEmail, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class CreateAuthorizationDto {
  @IsString()
  @IsNotEmpty()
  brandId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  loanId: string;

  //name 
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  contact: string;

  @IsNumber()
  @IsPositive()
  maxAmount: number;

  @IsDate()
  @Type(() => Date)
  expireAt: Date;

  @IsOptional()
  @IsString()
  paymentAutopayTransactionId: string;

  @IsOptional()
  @IsString()
  paymentRequestId: string;

}