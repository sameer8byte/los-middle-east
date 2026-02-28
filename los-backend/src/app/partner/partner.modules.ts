import { Module } from "@nestjs/common";
import { PartnerCustomerModule } from "./customers/partner.customer.modules";
import { PartnerAdminModule } from "./admin/partner.admin.modules";
import { PartnerUserModule } from "./users/partner.user.modules";
import { PartnerSettingModules } from "./settings/settings.modules";
import { PartnerLoansModule } from "./loans/partner.loans.modules";
import { PartnerCollectionModule } from "./collection/partner.collection.modules";
import { ReportModule } from "./report/report.modules";
import { NotificationModule } from "../../features/notification/notification.module";
import { BrandRejectionReasonsModule } from "./settings/brandStatusReasons/brandStatusReasons.settings.modules";
import { PartnerDashboardModule } from "./dashboard/partner.dashboard.modules";
import { PartnerGlobalSearchModule } from "./global-search/partner.global-search.module";
import { PartnerActivityTrackingModule } from "./activity-tracking/partner.activity-tracking.module";
import { CompletedLoansModule } from "./completed/completed.modules";
import { UserRemindersModule } from "./users-reminders/user-reminders.module";

@Module({
  imports: [
    PartnerDashboardModule,
    PartnerCustomerModule,
    PartnerAdminModule,
    PartnerCollectionModule,
    PartnerUserModule,
    PartnerSettingModules,
    NotificationModule,
    BrandRejectionReasonsModule,
    PartnerLoansModule,
    ReportModule,
    PartnerGlobalSearchModule,
    PartnerActivityTrackingModule,
    CompletedLoansModule,
    UserRemindersModule
  ],
})
export class PartnerModule {}
