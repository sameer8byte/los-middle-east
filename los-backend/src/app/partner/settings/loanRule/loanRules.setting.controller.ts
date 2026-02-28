import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { LoanRulesSettingService } from "./loanRules.setting.service";

@AuthType("partner")
@Controller("partner/brand/:brandId/settings/loan-rules")
export class LoanRulesSettingController {
  constructor(
    private readonly loanRulesSettingService: LoanRulesSettingService,
  ) {}

  // getBrandPolicyLinks
  @Get()
  async getBrandPolicyLinks(@Param("brandId") brandId: string) {
    return this.loanRulesSettingService.getLoanRules(brandId);
  }
  // getTenuresByRuleId
  @Get("tenures")
  async getTenuresByRuleId(
    @Param("brandId") brandId: string,
    @Query("loanRuleId") loanRuleId: string,
  ) {
    return this.loanRulesSettingService.getTenuresByRuleId(loanRuleId);
  }
  // getPenaltiesByTenureId
  @Get("penalties")
  async getPenaltiesByTenureId(
    @Param("brandId") brandId: string,
    @Query("loanRuleId") loanRuleId: string,
    @Query("tenureId") tenureId: string,
  ) {
    return this.loanRulesSettingService.getPenaltiesByTenureIdId(
      loanRuleId,
      tenureId,
    );
  }

  //patchLoanRules
  @Post()
  async patchLoanRules(
    @Param("brandId") brandId: string,
    @Body() body: any,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.loanRulesSettingService.patchLoanRules(brandId, partnerUser.id, body);
  }
  //loan_rule_tenures
  @Post("loan-rule-tenures")
  async patchLoanRuleTenures(
    @Param("brandId") brandId: string,
    @Body() body: any,
  ) {
    return this.loanRulesSettingService.patchLoanRuleTenures(brandId, body);
  }
  //loanPenalty
  @Post("loan-penalty")
  async patchLoanPenalty(@Param("brandId") brandId: string, @Body() body: any) {
    return this.loanRulesSettingService.patchLoanPenalty(brandId, body);
  }

  //loan_charge_config
  @Post("loan-charge-config")
  async patchLoanChargeConfig(
    @Param("brandId") brandId: string,
    @Body() body: any,
  ) {
    return this.loanRulesSettingService.patchLoanChargeConfig(brandId, body);
  }

  // loan_charge_taxes
  @Post("loan-charge-taxes")
  async patchLoanChargeTaxes(
    @Param("brandId") brandId: string,
    @Body() body: any,
  ) {
    return this.loanRulesSettingService.patchLoanChargeTaxes(brandId, body);
  }
}
