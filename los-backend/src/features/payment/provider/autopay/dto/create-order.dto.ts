// src/razorpay/dto/create-order.dto.ts
import { IsNumber, IsPositive, IsString, IsIn, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsIn(['INR'])
  currency: string;

  @IsBoolean()
  payment_capture: boolean;

  @IsString()
  @IsOptional()
  receipt?: string;

  @IsObject()
  @IsOptional()
  notes?: Record<string, any>;

  @IsString()
  @IsOptional()
  method?: string;

  @IsString()
  @IsOptional()
  customer_id?: string;

  @IsObject()
  @IsOptional()
  token?: any;
}