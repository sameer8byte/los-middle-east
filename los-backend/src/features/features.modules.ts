// src/upload/upload.module.ts
import { Module } from "@nestjs/common";
import { PartnerUserLoginReportModule } from "./partnerUserLoginReport";
import { LeadFormsModule } from "./leadForms/leadForms.module";
import { CcReminderModule } from "./ccReminder";

@Module({
  imports: [PartnerUserLoginReportModule, LeadFormsModule, CcReminderModule],
})
export class FeaturesModule {}
