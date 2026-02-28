import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import * as AWS from "aws-sdk";
import { platform_type } from "@prisma/client";
import { safeStringify } from "src/utils/json.util";

export interface AuditLogPayload {
  userId: string;
  message: string;
  partnerUserId?: string | null;
  brandId: string | null;
  loanId?: string | null;
  type: string; // varchar(64)
  platformType?: string | null;
  context:Record<string, any>; // Prisma.JsonValue
}

@Injectable()
export class AwsAuditLogsSqsService {
  private readonly sqs: AWS.SQS;
  private readonly logger = new Logger(AwsAuditLogsSqsService.name);

  constructor() {
    this.sqs = new AWS.SQS({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "ap-south-1",
    });
  }

  async sendToAuditLogsQueue(messageBody: AuditLogPayload): Promise<void> {
    // Skip if SQS queue URL is not configured
    if (!process.env.SQS_AUDIT_LOGS_QUEUE_URL) {
      return;
    }
    try {
      const params = {
        QueueUrl: process.env.SQS_AUDIT_LOGS_QUEUE_URL,
        MessageBody: safeStringify(messageBody),
      };

      await this.sqs.sendMessage(params).promise();
    } catch (error) {
      throw new BadRequestException(
        error.message || "Failed to queue audit log processing",
      );
    }
  }

  async pollAuditLogsQueue(maxMessages: number = 1): Promise<any[]> {
    // Skip if SQS queue URL is not configured
    if (!process.env.SQS_AUDIT_LOGS_QUEUE_URL) {
      this.logger.warn(
        "SQS_AUDIT_LOGS_QUEUE_URL not configured. Skipping queue poll",
      );
      return [];
    }

    try {
      const params = {
        QueueUrl: process.env.SQS_AUDIT_LOGS_QUEUE_URL,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 300,
      };

      const data = await this.sqs.receiveMessage(params).promise();
      return data.Messages || [];
    } catch (error) {
      this.logger.error("Error polling SQS queue:", error);
      return [];
    }
  }

  async deleteAuditLogMessage(receiptHandle: string): Promise<void> {
    // Skip if SQS queue URL is not configured
    if (!process.env.SQS_AUDIT_LOGS_QUEUE_URL) {
      this.logger.warn(
        "SQS_AUDIT_LOGS_QUEUE_URL not configured. Skipping message deletion",
      );
      return;
    }

    try {
      const params = {
        QueueUrl: process.env.SQS_AUDIT_LOGS_QUEUE_URL,
        ReceiptHandle: receiptHandle,
      };

      await this.sqs.deleteMessage(params).promise();
    } catch (error) {
      this.logger.error("Error deleting SQS message:", error);
      throw error;
    }
  }
}
