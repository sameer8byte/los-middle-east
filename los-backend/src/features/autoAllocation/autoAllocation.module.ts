import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { NotificationModule } from "src/features/notification/notification.module";
import { UserLogsModule } from "src/features/user-logs/user-logs.module";
import { AwsModule } from "src/core/aws/aws.module";
import { CollectionService } from "./services/collection.autoAllocation.service";
import { AutoAllocationUserService } from "./services/user.autoAllocation.service";
import { AutoAllocationLoanService } from "./services/loan.autoAllocation.service";
import { AwsAuditLogsSqsService } from "src/core/aws/sqs/aws-audit-logs-sqs.service";

@Module({
  imports: [PrismaModule, NotificationModule, UserLogsModule, AwsModule],
  providers: [CollectionService, AutoAllocationUserService, AutoAllocationLoanService,AwsAuditLogsSqsService],
  exports: [CollectionService, AutoAllocationUserService, AutoAllocationLoanService],
})
export class AutoAllocationModule {}
