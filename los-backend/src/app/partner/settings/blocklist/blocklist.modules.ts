import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { BlocklistController } from "./blocklist.controller";
import { BlocklistService } from "./blocklist.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Module({
  imports: [PrismaModule],
  controllers: [BlocklistController],
  providers: [BlocklistService, BrandSettingAuditLogService],
  exports: [BlocklistService, BrandSettingAuditLogService],
})
export class BrandBlocklistModule {}
