import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

enum NonRepaymentDateType {
  BRAND_NON_REPAYMENT = 'BRAND_NON_REPAYMENT',
  PARTNER_UNAVAILABILITY = 'PARTNER_UNAVAILABILITY',
}

export class CreateNonRepaymentDateDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  state: string;

  @IsEnum(NonRepaymentDateType)
  @IsOptional()
  type?: NonRepaymentDateType;
}
