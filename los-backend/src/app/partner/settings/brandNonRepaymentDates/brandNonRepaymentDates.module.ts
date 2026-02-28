import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { BrandNonRepaymentDatesController } from "./brandNonRepaymentDates.controller";
import { BrandNonRepaymentDatesService } from "./brandNonRepaymentDates.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Module({
  imports: [PrismaModule],
  controllers: [BrandNonRepaymentDatesController],
  providers: [BrandNonRepaymentDatesService, BrandSettingAuditLogService],
  exports: [BrandNonRepaymentDatesService, BrandSettingAuditLogService],
})
export class BrandNonRepaymentDatesModule {}
