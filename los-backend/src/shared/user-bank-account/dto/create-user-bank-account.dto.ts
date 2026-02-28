// create-user-bank-account.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import {
  user_bank_verification_method,
  user_bank_verification_status,
} from "@prisma/client";

export class CreateUserBankAccountDto {
  @IsString()
  @IsNotEmpty()
  accountHolderName: string;

  @IsString()
  @IsNotEmpty()
  bankAddress: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  ifscCode: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  accountType: string;

  @IsOptional()
  @IsEnum(user_bank_verification_method)
  verificationMethod?: user_bank_verification_method;

  @IsOptional()
  @IsEnum(user_bank_verification_status)
  verificationStatus?: user_bank_verification_status;

  @IsOptional()
  @IsString()
  verifiedAt?: string;
}
