import { Module } from "@nestjs/common";
import { NocWorkerService } from "./non-worker.service";
import { ReminderWorkerService } from "./reminder-worker.service";
import { AuditLogsWorkerService } from "./audit-logs-worker.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { AwsModule } from "src/core/aws/aws.module";
import { PartnerLoansModule } from "src/app/partner/loans/partner.loans.modules";
import { CommunicationModule } from "src/core/communication/communication.module";

@Module({
  imports: [PrismaModule, AwsModule, PartnerLoansModule, CommunicationModule],
  providers: [NocWorkerService, AuditLogsWorkerService,ReminderWorkerService],
  exports: [NocWorkerService, AuditLogsWorkerService,ReminderWorkerService],
})
export class WorkersModule {}
