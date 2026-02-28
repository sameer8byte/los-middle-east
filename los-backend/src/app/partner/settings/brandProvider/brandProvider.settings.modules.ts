import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { BrandProviderController } from "./brandProvider.setting.controller";
import { BrandProviderService } from "./brandProvider.setting.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Module({
  imports: [PrismaModule],
  controllers: [BrandProviderController],
  providers: [BrandProviderService, BrandSettingAuditLogService],
  exports: [BrandProviderService, BrandSettingAuditLogService],
})
export class BrandProviderModule {}
