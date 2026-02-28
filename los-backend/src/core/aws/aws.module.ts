import { Module } from "@nestjs/common";
import { AwsPublicS3Service } from "./s3/aws-public-s3.service";
import { AwsPrivateS3Service } from "./s3/aws-private-s3.service";
import { AwsReminderSqsService } from "./sqs/aws-remindar-sqs.service";
import { AwsNOCSqsService } from "./sqs/aws-noc-sqs.service";
import { AwsAuditLogsSqsService } from "./sqs/aws-audit-logs-sqs.service";

const providers = [
  AwsPublicS3Service,
  AwsPrivateS3Service,
  ...(process.env.SQS_QUEUE_URL ? [AwsNOCSqsService] : []),
  ...(process.env.SQS_AUDIT_LOGS_QUEUE_URL ? [AwsAuditLogsSqsService] : []),
  ...(process.env.SQS_REMINDER_QUEUE_URL ? [AwsReminderSqsService] : []),
];

@Module({
  providers,
  exports: providers,
})
export class AwsModule {}
