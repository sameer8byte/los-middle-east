import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { CommunicationModule } from "src/core/communication/communication.module";
import { ReportService } from "./report.services";
import { ReportController } from "./report.controller";
import { ReportLogService } from "./report-log.service";

@Module({
  imports: [PrismaModule, CommunicationModule],
  controllers: [ReportController],
  providers: [ReportService, ReportLogService],
  exports: [ReportService, ReportLogService],
})
export class ReportModule {}
