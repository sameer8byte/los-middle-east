import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { AppearanceService } from "./appearance.setting.service";
import { AppearanceController } from "./appearance.setting.controller";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Module({
  imports: [PrismaModule],
  controllers: [AppearanceController],
  providers: [AppearanceService, BrandSettingAuditLogService],
  exports: [AppearanceService, BrandSettingAuditLogService],
})
export class AppearanceModule {}
