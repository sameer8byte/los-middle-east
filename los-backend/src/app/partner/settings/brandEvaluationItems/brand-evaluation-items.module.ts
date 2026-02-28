import { Module } from "@nestjs/common";
import { BrandEvaluationItemsController } from "./brand-evaluation-items.controller";
import { BrandEvaluationItemsService } from "./brand-evaluation-items.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Module({
  imports: [PrismaModule],
  controllers: [BrandEvaluationItemsController],
  providers: [BrandEvaluationItemsService, BrandSettingAuditLogService],
  exports: [BrandEvaluationItemsService, BrandSettingAuditLogService],
})
export class BrandEvaluationItemsModule {}
