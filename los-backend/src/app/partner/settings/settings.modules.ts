import { Module } from "@nestjs/common";
import { AppearanceModule } from "./appearance/appearance.settings.modules";
import { BrandModule } from "./brand/brand.settings.modules";
import { BrandCardsModule } from "./brandCards/brand-cards.module";
import { BrandPolicyLinksModule } from "./brandPolicyLinks/brandPolicyLinks.settings.modules";
import { LoanRulesSettingModule } from "./loanRule/loanRules.settings.modules";
import { BrandBankAccountModule } from "./brandBankAccount/brandBankAccount.settings.modules";
import { BrandBlocklistModule } from "./blocklist/blocklist.modules";
import { BrandNonRepaymentDatesModule } from "./brandNonRepaymentDates/brandNonRepaymentDates.module";
import { PartnerUnavailabilityDatesModule } from "./partnerUnavailabilityDates/partnerUnavailabilityDates.module";
import { BrandProviderModule } from "./brandProvider/brandProvider.settings.modules";
import { BrandEvaluationItemsModule } from "./brandEvaluationItems/brand-evaluation-items.module";
import { BrandBlogsModule } from "./brandBlogs/brandBlogs.settings.modules";
import { BrandSettingAuditLogModule } from "./common/brand-setting-audit-log.module";
import { BrandRejectionReasonsModule } from "./brandStatusReasons/brandStatusReasons.settings.modules";

@Module({
  imports: [
    LoanRulesSettingModule,
    BrandModule,
    BrandCardsModule,
    BrandPolicyLinksModule,
    AppearanceModule,
    BrandBankAccountModule,
    BrandBlocklistModule,
    BrandNonRepaymentDatesModule,
    PartnerUnavailabilityDatesModule,
    BrandProviderModule,
    BrandEvaluationItemsModule,
    BrandBlogsModule,
    BrandSettingAuditLogModule,
    BrandRejectionReasonsModule,
  ],
})
export class PartnerSettingModules {}
