import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { BrandStatusReasonsController } from "./brandStatusReasons.setting.controller";
import { BrandStatusReasonsService } from "./brandStatusReasons.setting.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Module({
  imports: [PrismaModule],

  controllers: [BrandStatusReasonsController],
  providers: [BrandStatusReasonsService, BrandSettingAuditLogService],
  exports: [BrandStatusReasonsService, BrandSettingAuditLogService],
})
export class BrandRejectionReasonsModule {}
