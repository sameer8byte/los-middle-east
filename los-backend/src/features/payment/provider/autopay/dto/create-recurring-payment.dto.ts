// src/razorpay/dto/create-recurring-payment.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsDate, IsOptional, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRecurringPaymentDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  loanId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  contact: string;

  @IsString()
  @IsNotEmpty()
  tokenId: string;

  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  paymentRequestId: string;
}