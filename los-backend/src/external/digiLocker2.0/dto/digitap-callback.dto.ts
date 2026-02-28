import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from "class-validator";

/**
 * Digitap KYC Unified Callback DTO
 * Received when user completes Digitap KYC verification
 */
export class DigitapCallbackDto {
  @IsString()
  @IsNotEmpty()
  uniqueId: string;

  @IsString()
  @IsNotEmpty()
  status: string; // "success" or "failure"

  @IsString()
  @IsOptional()
  requestId?: string;

  @IsObject()
  @IsOptional()
  data?: any; // KYC data from Digitap

  @IsString()
  @IsOptional()
  error?: string;

  @IsString()
  @IsOptional()
  message?: string;
}

