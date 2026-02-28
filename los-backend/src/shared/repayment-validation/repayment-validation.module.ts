import { Module } from "@nestjs/common";
import { RepaymentValidationService } from "./repayment-validation.service";
import { BrandNonRepaymentDatesModule } from "../../app/partner/settings/brandNonRepaymentDates/brandNonRepaymentDates.module";

@Module({
  imports: [BrandNonRepaymentDatesModule],
  providers: [RepaymentValidationService],
  exports: [RepaymentValidationService],
})
export class RepaymentValidationModule {}
