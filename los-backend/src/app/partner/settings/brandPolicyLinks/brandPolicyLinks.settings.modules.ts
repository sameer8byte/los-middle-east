import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { BrandPolicyLinksController } from "./brandPolicyLinks.setting.controller";
import { BrandPolicyLinksSettingService } from "./brandPolicyLinks.setting.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Module({
  imports: [PrismaModule],
  controllers: [BrandPolicyLinksController],
  providers: [BrandPolicyLinksSettingService, BrandSettingAuditLogService],
  exports: [BrandPolicyLinksSettingService, BrandSettingAuditLogService],
})
export class BrandPolicyLinksModule {}
// Compare this snippet from src/app/partner/settings/loanRules/loanRules.setting.controller.ts:
