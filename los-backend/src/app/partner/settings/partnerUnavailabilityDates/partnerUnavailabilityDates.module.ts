import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { PartnerUnavailabilityDatesController } from "./partnerUnavailabilityDates.controller";
import { PartnerUnavailabilityDatesService } from "./partnerUnavailabilityDates.service";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Module({
  imports: [PrismaModule],
  controllers: [PartnerUnavailabilityDatesController],
  providers: [PartnerUnavailabilityDatesService, BrandSettingAuditLogService],
  exports: [PartnerUnavailabilityDatesService, BrandSettingAuditLogService],
})
export class PartnerUnavailabilityDatesModule {}
