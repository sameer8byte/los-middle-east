import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { BasReportModule } from "src/features/bsaReport/bsaReport.module";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { PartnerCollectionService } from "./partner.collection.service";
import { PartnerCollectionController } from "./partner.collection.controller";
import { BankAccountStatementModule } from "src/shared/bank-account-statement/bank-account-statement.module";
import { DocumentsModule } from "src/shared/documents/documents.module";
import { EmploymentModule } from "src/shared/employment/employment.module";
import { UserBankAccountModule } from "src/shared/user-bank-account/user-bank-account.module";
import { UserDetailsModule } from "src/shared/user-details/user-details.module";
import { UsersModule } from "src/shared/user/user.module";
import { UserLogsModule } from "src/features/user-logs/user-logs.module";

@Module({
  imports: [
    UserLogsModule,
    PrismaModule,
    UsersModule,
    UserDetailsModule,
    UserBankAccountModule,
    BankAccountStatementModule,
    EmploymentModule,
    DocumentsModule,
    BasReportModule,
  ],
  controllers: [PartnerCollectionController],
  providers: [PartnerCollectionService, AwsPublicS3Service],
  exports: [PartnerCollectionService],
})
export class PartnerCollectionModule {}
