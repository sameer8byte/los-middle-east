import { Module } from "@nestjs/common";
import { BrandRulesValidationService } from "./brand.validation.service";
 
@Module({
  //   controllers: [LoanValidationController],
  providers: [BrandRulesValidationService],
  exports: [BrandRulesValidationService],
})
export class BrandLoanValidationModule {}
