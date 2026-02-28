import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { PartnerCustomerController } from "./partner.customer.controller";
import { PartnerCustomerService } from "./partner.customer.service";
import { UserSalaryService } from "./services/user-salary.service";
import { BasReportModule } from "src/features/bsaReport/bsaReport.module";
import { WebKycModule } from "src/app/web/kyc/web.kyc.module";
import { BankAccountStatementModule } from "src/shared/bank-account-statement/bank-account-statement.module";
import { DocumentsModule } from "src/shared/documents/documents.module";
import { EmploymentModule } from "src/shared/employment/employment.module";
import { UserBankAccountModule } from "src/shared/user-bank-account/user-bank-account.module";
import { UserDetailsModule } from "src/shared/user-details/user-details.module";
import { UsersModule } from "src/shared/user/user.module";
import { CommunicationModule } from "src/core/communication/communication.module";
import { OtpVerificationModule } from "src/shared/otpVerification/otp-verification.module";
import { AlternatePhoneNumberModule } from "src/shared/alternate-phone-number/alternate-phone-number.module";
import { UserLogsModule } from "src/features/user-logs/user-logs.module";
import { PhoneToUanModule } from "src/external/phoneToUan/phoneToUan.module";
import { DigiLocker20Module } from "src/external/digiLocker2.0";
import { AutoAllocationModule } from "src/features/autoAllocation/autoAllocation.module";
import { PennyDropModule } from "src/external/pennyDrop/pennyDrop.modules";
import { AwsModule } from "src/core/aws/aws.module";
import { AwsAuditLogsSqsService } from "src/core/aws/sqs/aws-audit-logs-sqs.service";
@Module({
  imports: [
    UserLogsModule,
    AutoAllocationModule,
    PrismaModule,
    UsersModule,
    UserDetailsModule,
    UserBankAccountModule,
    BankAccountStatementModule,
    EmploymentModule,
    DocumentsModule,
    BasReportModule,
    WebKycModule,
    CommunicationModule,
    OtpVerificationModule,
    AlternatePhoneNumberModule,
    PhoneToUanModule,
    PennyDropModule,
    AwsModule,
    DigiLocker20Module.register({
      signzy: {
        baseUrl: process.env.SIGNZY_DIGILOCKER_BASE_URL,
        accessToken: process.env.SIGNZY_DIGILOCKER_ACCESS_TOKEN,
      },
      digitap: {
        baseUrl: process.env.DIGITAP_DIGILOCKER_BASE_URL,
        authKey: process.env.DIGITAP_DIGILOCKER_AUTH_KEY,
      },
    })
  ],
  controllers: [PartnerCustomerController],
  providers: [PartnerCustomerService, UserSalaryService, AwsAuditLogsSqsService],
  exports: [PartnerCustomerService],
})
export class PartnerCustomerModule {}
