import { Module } from "@nestjs/common";
import { PdfModule } from "src/core/pdf/pdf.module";
import { LoansService } from "./services/loans.services";
import { LoansController } from "./controllers/loans.controller";
import { EquifaxModule } from "src/external/equifax/equifax.module";
import { ScoreMeModule } from "src/external/scoreme/scoreme.module";
import { BasReportModule } from "src/features/bsaReport/bsaReport.module";
import { LoanEmailRemindarService } from "./services/loan.email.remindar.service";
import { UsersModule } from "src/shared/user/user.module";
import { CommunicationModule } from "src/core/communication/communication.module";
import { LoanEmailReminderController } from "./controllers/loan.email.reminder.controller";
import { LoanRemindarEmailLogService } from "./services/loan.remindar-email.log.service";
import { EmailReminderConfigController } from "./controllers/email.reminder.config.controller";
import { EmailReminderConfigService } from "./services/email.reminder.config.service";
import { NotificationModule } from "src/features/notification/notification.module";
import { AutoAllocationModule } from "src/features/autoAllocation/autoAllocation.module";
import { UserLogsModule } from "src/features/user-logs/user-logs.module";
import { AwsModule } from "src/core/aws/aws.module";
import { AwsAuditLogsSqsService } from "src/core/aws/sqs/aws-audit-logs-sqs.service";
import { ReloanAutomationService } from "./services/reloan.automation.service";
import { ReloanAutomationController } from "./controllers/reloan.automation.controller";
import { EsignModule } from "src/features/esign/esign.module";

@Module({
  imports: [
    UsersModule,
    PdfModule,
    EquifaxModule,
    ScoreMeModule,
    BasReportModule,
    CommunicationModule,
    NotificationModule,
    AutoAllocationModule,
    UserLogsModule,
    AwsModule,
    EsignModule,
  ],
  controllers: [
    LoansController,
    LoanEmailReminderController,
    EmailReminderConfigController,
    ReloanAutomationController
  ],
  providers: [
    LoansService,
    LoanEmailRemindarService,
    ReloanAutomationService,
    LoanRemindarEmailLogService,
    EmailReminderConfigService,
    AwsAuditLogsSqsService
  ],
  exports: [LoansService, LoanEmailRemindarService,ReloanAutomationService], // in case you want to use it in other modules
})
export class LoansModule {}
