import { PaymentMethodEnum } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsString, IsArray, ValidateNested, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class BulkDisbursementItemDto {
  @IsString()
  @IsNotEmpty()
  formattedLoanId: string;

  @IsEnum(PaymentMethodEnum)
  @IsNotEmpty()
  method: PaymentMethodEnum;

  @IsString()
  @IsNotEmpty()
  externalRef: string;

  @IsString()
  @IsNotEmpty()
  brandBankAccountId: string;

  @IsString()
  @IsOptional()
  disbursementDate?: string | null;
}

export class BulkDisbursementDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkDisbursementItemDto)
  disbursements: BulkDisbursementItemDto[];
}

export interface BulkDisbursementResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: {
    formattedLoanId: string;
    success: boolean;
    error?: string;
  }[];
}
