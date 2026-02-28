// src/razorpay/dto/create-customer.dto.ts
import { IsString, IsNotEmpty, IsEmail, IsObject, IsOptional } from 'class-validator';

export class CreateCustomerDto {

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  contact: string;

  @IsObject()
  @IsOptional()
  notes?: Record<string, any>;
}