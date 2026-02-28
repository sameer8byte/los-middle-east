import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { BrandSettingAuditLogService } from "./brand-setting-audit-log.service";
import { BrandSettingAuditLogController } from "./brand-setting-audit-log.controller";

@Module({
  imports: [PrismaModule],
  controllers: [BrandSettingAuditLogController],
  providers: [BrandSettingAuditLogService],
  exports: [BrandSettingAuditLogService],
})
export class BrandSettingAuditLogModule {}
