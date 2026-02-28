import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { CommunicationModule } from "src/core/communication/communication.module";
import { LoansModule } from "src/features/loans/loans.modules";
import { PdfModule } from "src/core/pdf/pdf.module";
import { PartnerDashboardController } from "./partner.dashboard.controller";
import { PartnerDashboardService } from "./partner.dashboard.service";

@Module({
  imports: [PrismaModule, CommunicationModule, LoansModule, PdfModule],
  controllers: [PartnerDashboardController],
  providers: [PartnerDashboardService],
  exports: [PartnerDashboardService],
})
export class PartnerDashboardModule {}
