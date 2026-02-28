import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsBoolean,
  Validate,
  ValidateIf,
} from "class-validator";
import { PaymentMethodEnum, TransactionStatusEnum } from "@prisma/client";
import { Transform } from "class-transformer";
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from "class-validator";

@ValidatorConstraint({ name: "isNotManual", async: false })
class IsNotManualConstraint implements ValidatorConstraintInterface {
  validate(value: PaymentMethodEnum, args: ValidationArguments) {
    return value !== PaymentMethodEnum.MANUAL;
  }

  defaultMessage(args: ValidationArguments) {
    return "Method cannot be MANUAL";
  }
}

export class CreatePaymentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  loanId: string;

  @IsEnum(PaymentMethodEnum, {
    message: "Method must be one of: MANUAL, PAYTERNING, RAZORPAY",
  })
  @Validate(IsNotManualConstraint)
  method: PaymentMethodEnum;
}


export class PaymentAmountDto {
  @IsNumber()
  penalty: number;

  @IsNumber()
  interest: number;

  @IsNumber()
  principal: number;

  @IsNumber()
  discount: number;

  @IsNumber()
  total: number;
}

export class CreateManualPaymentDto {
  @IsUUID()
  loanId: string;

  @IsEnum(PaymentMethodEnum)
  method: PaymentMethodEnum;

  @IsOptional()
  @IsString()
  @ValidateIf(o => o.method === PaymentMethodEnum.MANUAL)
  @IsNotEmpty({ message: 'Payment reference is required for manual payments' })
  paymentReference?: string;

  @IsOptional()
  @IsUUID()
  @ValidateIf(o => o.method === PaymentMethodEnum.MANUAL)
  @IsNotEmpty({ message: 'Brand Bank Account ID is required for manual payments' })
  brandBankAccountId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Payment notes are required' })
  paymentNote: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsEnum(TransactionStatusEnum)
  paymentRequestStatus: TransactionStatusEnum;

  @IsEnum(["PAID", "PARTIALLY_PAID"], {
    message: "Status must be PAID or PARTIALLY_PAID",
  })
  status: "PAID" | "PARTIALLY_PAID";

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true")
  isReloanApplicable: boolean;

  @IsOptional()
  @IsString()
  reloanRemark?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true")
  isPaymentComplete: boolean;

  @IsOptional()
  @IsString()
  excessAmount: string;
}