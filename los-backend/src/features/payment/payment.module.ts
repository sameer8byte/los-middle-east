import { Module } from "@nestjs/common";
import { PaymentService } from "./services/payment.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { PaymentController } from "./collection/payment.controller";
import { AutopayCollectionController } from "./collection/autopay.collection";
import { LoansModule } from "src/features/loans/loans.modules";
import { PaytringService } from "./provider/paytring.service";
import { HttpModule } from "@nestjs/axios";
import { AwsModule } from "src/core/aws/aws.module";
import { PartnerLoansModule } from "src/app/partner/loans/partner.loans.modules";
import { RepaymentValidationModule } from "src/shared/repayment-validation/repayment-validation.module";
import { NotificationModule } from "src/features/notification/notification.module";
import { RazorpayService } from "./provider/razorpay.service";
import { CommunicationModule } from "src/core/communication/communication.module";
import { CashfreeService } from "./provider/cashfree.service";
import { IDFCProvider } from "./provider/idfc.disbursement.service";
import { PartnerUserModule } from "src/app/partner/users/partner.user.modules";
import { RazorpayAutoPayService } from "./provider/autopay/razorpay-autopay.service";
import { AutopayService } from "./services/autopay.service";
import { UserLogsModule } from "src/features/user-logs/user-logs.module";
import { ICICIProvider } from "src/features/payment/provider/icici.disbursement.service"

@Module({
  imports: [
    PrismaModule,
    LoansModule,
    HttpModule.register({
      timeout: 20000,
      maxRedirects: 5,
    }),
    PartnerLoansModule,
    PartnerUserModule,
    RepaymentValidationModule,
    NotificationModule,
    CommunicationModule,
    UserLogsModule,
    AwsModule,
  ],
  controllers: [PaymentController, AutopayCollectionController],
  providers: [
    PaymentService,
    PaytringService,
    IDFCProvider,
    ICICIProvider,
    RazorpayService,
    CashfreeService,
    RazorpayAutoPayService,
    AutopayService,
  ],
  exports: [PaymentService, RazorpayService, AutopayService],
})
export class PaymentModule {}
