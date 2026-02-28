import { Module } from "@nestjs/common";
import { PartnerLoansController } from "./partner.loans.controller";
import { PartnerLoansService } from "./partner.loans.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { PdfModule } from "src/core/pdf/pdf.module";
import { CommunicationModule } from "src/core/communication/communication.module";
import { NotificationModule } from "src/features/notification/notification.module";
import { UserLogsModule } from "src/features/user-logs/user-logs.module";
import { CollectionService } from "src/features/autoAllocation/services/collection.autoAllocation.service";
import { LoansModule } from "src/features/loans/loans.modules";
import { AwsModule } from "src/core/aws/aws.module";

@Module({
  imports: [
    UserLogsModule,
    PrismaModule,
    PdfModule,
    CommunicationModule,
    LoansModule,
    NotificationModule,
    AwsModule,
  ],
  controllers: [PartnerLoansController],
  providers: [PartnerLoansService, CollectionService],
  exports: [PartnerLoansService],
})
export class PartnerLoansModule {}
