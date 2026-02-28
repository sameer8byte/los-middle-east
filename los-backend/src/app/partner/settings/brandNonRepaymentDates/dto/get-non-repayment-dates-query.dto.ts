import { Transform } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  IsBoolean,
  IsEnum,
} from "class-validator";

enum NonRepaymentDateType {
  BRAND_NON_REPAYMENT = 'BRAND_NON_REPAYMENT',
  PARTNER_UNAVAILABILITY = 'PARTNER_UNAVAILABILITY',
}

export class GetNonRepaymentDatesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2030)
  @Transform(({ value }) => parseInt(value, 10))
  year?: number;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }
    return value;
  })
  active?: boolean;

  @IsOptional()
  @IsEnum(NonRepaymentDateType)
  type?: NonRepaymentDateType;
}
