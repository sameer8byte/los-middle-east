import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  NotFoundException
} from "@nestjs/common";
import {
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsPositive,
} from "class-validator";
import { Expose } from "class-transformer";
import { AuthType } from "src/common/decorators/auth.decorator";
import { AutopayService } from "../services/autopay.service";

export class CreateAutopayTransactionDto {
  @Expose()
  @IsUUID()
  userId: string;

  @Expose()
  @IsUUID()
  loanId: string;
}


export class CreateRecurringPaymentDto {
  @Expose()
  @IsUUID()
  loanId: string;

  @Expose()
  @IsNumber()
  @IsPositive()
  amount: number;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CheckAutopayEligibilityDto {
  @Expose()
  @IsUUID()
  userId: string;

  @Expose()
  @IsUUID()
  loanId: string;
}

@Controller("payment-autopay")
export class AutopayCollectionController {
  constructor(private readonly autopayService: AutopayService) {}

  @Post("autopay-transaction")
  @AuthType("partner")
  @HttpCode(HttpStatus.CREATED)
  async createAutopayTransaction(
    @Param("brandId") brandId: string,
    @Body() dto: CreateAutopayTransactionDto
  ) {
    return this.autopayService.createAutopayTransaction({
      brandId,
      userId: dto.userId,
      loanId: dto.loanId,
    });
  }

 @Post("recurring-payment")
  @AuthType("partner")
  @HttpCode(HttpStatus.CREATED)
  async createRecurringPayment(
    @Body() dto: CreateRecurringPaymentDto
  ) {
    return this.autopayService.createRecurringPayment({
      loanId: dto.loanId,
      amount: dto.amount,
      description: dto.description,
    });
  }
  
  @Post("razorpay-autopay-webhook")
  @HttpCode(HttpStatus.OK)
  @AuthType('public')
  async handleRazorpayAutopayWebhook(
    @Body() data: any
  ) {
    return this.autopayService.handleRazorpayAutopayWebhook(data);
  }

  @Post("check-eligibility")
  @AuthType("partner")
  @HttpCode(HttpStatus.OK)
  async checkAutopayEligibility(
    @Body() dto: CheckAutopayEligibilityDto
  ) {
    const result = await this.autopayService.checkUserAutopayEligibility({
      userId: dto.userId,
      loanId: dto.loanId,
    });

    if (!result.eligible) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: result.message,
      });
    }

    return result;
  }
}
