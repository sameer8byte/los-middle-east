import { Module } from "@nestjs/common";
import { WebBankService } from "./web.bank.service";
import { WebBankController } from "./web.bank.controller";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { BasReportModule } from "src/features/bsaReport/bsaReport.module";
import { BankAccountStatementModule } from "src/shared/bank-account-statement/bank-account-statement.module";
import { UserBankAccountModule } from "src/shared/user-bank-account/user-bank-account.module";
import { UserLogsModule } from "src/features/user-logs/user-logs.module";
import { PennyDropModule } from "src/external/pennyDrop/pennyDrop.modules";

@Module({
  imports: [
    UserLogsModule,
    UserBankAccountModule,
    BankAccountStatementModule,
    BasReportModule,
    PennyDropModule,
  ],
  controllers: [WebBankController],
  providers: [WebBankService, AwsPublicS3Service],
  exports: [WebBankService], // in case you want to use it in other modules
})
export class WebBankModule {}
