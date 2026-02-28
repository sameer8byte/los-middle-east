import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { PartnerUserLoginReportController } from "./partnerUserLoginReport.controller";
import { PartnerUserLoginReportService } from "./partnerUserLoginReport.service";

@Module({
  controllers: [PartnerUserLoginReportController],
  providers: [PartnerUserLoginReportService, PrismaService],
  exports: [PartnerUserLoginReportService],
})
export class PartnerUserLoginReportModule {}
