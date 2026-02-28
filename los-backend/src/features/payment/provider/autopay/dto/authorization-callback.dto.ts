// src/razorpay/dto/authorization-callback.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class AuthorizationCallbackDto {
  @IsString()
  @IsNotEmpty()
  razorpay_payment_id: string;

  @IsString()
  @IsNotEmpty()
  razorpay_order_id: string;

  @IsString()
  @IsNotEmpty()
  razorpay_signature: string;
}