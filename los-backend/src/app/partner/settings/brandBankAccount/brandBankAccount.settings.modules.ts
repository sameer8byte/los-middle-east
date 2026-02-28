import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { BrandBankAccountController } from "./brandBankAccount.setting.controller";
import { BrandBankAccountService } from "./brandBankAccount.setting.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Module({
  imports: [PrismaModule],
  controllers: [BrandBankAccountController],
  providers: [BrandBankAccountService, BrandSettingAuditLogService],
  exports: [BrandBankAccountService, BrandSettingAuditLogService],
})
export class BrandBankAccountModule {}
