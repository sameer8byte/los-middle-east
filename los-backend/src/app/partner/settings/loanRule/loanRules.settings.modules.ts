import { PrismaModule } from "src/prisma/prisma.module";
import { LoanRulesSettingService } from "./loanRules.setting.service";
import { LoanRulesSettingController } from "./loanRules.setting.controller";
import { Module } from "@nestjs/common";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Module({
  imports: [PrismaModule],
  controllers: [LoanRulesSettingController],
  providers: [LoanRulesSettingService, BrandSettingAuditLogService],
  exports: [LoanRulesSettingService, BrandSettingAuditLogService],
})
export class LoanRulesSettingModule {}
