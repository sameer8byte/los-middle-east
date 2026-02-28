import { PaymentMethodEnum } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  MinLength,
} from "class-validator";
import { TransferTypeEnum } from "./idfc-disbursement.dto";

export class HandleDisbursementTransactionDto {
  @IsString()
  @IsNotEmpty()
  paymentRequestId: string;

  @IsString()
  @IsNotEmpty()
  loanId: string;

  @IsEnum(PaymentMethodEnum)
  @IsNotEmpty()
  method: PaymentMethodEnum;

  @IsString()
  @ValidateIf((o) => o.method !== PaymentMethodEnum.IDFC && o.method !== PaymentMethodEnum.ICICI)
  @IsNotEmpty({
    message: "External reference is required for non-IDFC and non-ICICI disbursements",
  })
  @IsOptional()
  externalRef?: string;

  @IsString()
  @ValidateIf((o) => o.method !== PaymentMethodEnum.IDFC && o.method !== PaymentMethodEnum.ICICI)
  @IsNotEmpty({
    message: "Brand bank account is required for non-IDFC and non-ICICI disbursements",
  })
  @IsOptional()
  brandBankAccountId?: string;

  @IsString()
  @ValidateIf((o) => o.method !== PaymentMethodEnum.IDFC && o.method !== PaymentMethodEnum.ICICI)
  @IsNotEmpty({
    message: "Disbursement date is required for non-IDFC  and non-ICICI disbursements",
  })
  @IsOptional()
  disbursementDate?: string | null;

  @IsString()
  @ValidateIf((o) => o.method === PaymentMethodEnum.IDFC || o.method === PaymentMethodEnum.ICICI)
  @IsNotEmpty({ message: "Password is required for IDFC and ICICI disbursements" })
  @MinLength(4, { message: "Password must be at least 4 characters" })
  @IsOptional()
  confirmPassword?: string;

  @IsEnum(TransferTypeEnum)
  @ValidateIf(
    (o) =>
      o.method === PaymentMethodEnum.IDFC ||
      o.method === PaymentMethodEnum.ICICI,
  )
  @IsNotEmpty({
    message: `IDFC transfer type is required for IDFC and ICICI disbursements`,
  })
  @IsOptional()
  transferType?: TransferTypeEnum;
}
