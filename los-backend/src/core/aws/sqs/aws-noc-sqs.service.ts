import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import * as AWS from "aws-sdk";
import { safeStringify } from "src/utils/json.util";
/**
 * job-tracking.types.ts
 * --------------------------------------------------
 * Central source of truth for all job / event tracking
 * Used by: queues, audit logs, cron jobs, ops tools
 * Compatible with NestJS, Prisma, Bull, SQS, Kafka
 * --------------------------------------------------
 */

/* ==================================================
 * JOB TYPES
 * ================================================== */
export const JobType = {
  // ────────────── NOC & LOAN DOCUMENTS ──────────────
  AUTO_NOC_GENERATION: "AUTO_NOC_GENERATION",
} as const;

export type JobType = (typeof JobType)[keyof typeof JobType];

/* ==================================================
 * JOB STATUS
 * ================================================== */
export const JobStatus = {
  QUEUED: "QUEUED",
  IN_PROGRESS: "IN_PROGRESS",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  RETRYING: "RETRYING",
  CANCELLED: "CANCELLED",
  SKIPPED: "SKIPPED",
  EXPIRED: "EXPIRED",
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/* ==================================================
 * FAILURE REASONS
 * ================================================== */
export const JobFailureReason = {
  TIMEOUT: "TIMEOUT",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  FRAUD_BLOCKED: "FRAUD_BLOCKED",
  SYSTEM_ERROR: "SYSTEM_ERROR",
} as const;

export type JobFailureReason =
  (typeof JobFailureReason)[keyof typeof JobFailureReason];

/* ==================================================
 * MAIN TRACKING PAYLOAD
 * ================================================== */
export interface JobTrackingPayload {
  trackingId: string;

  loanId: string;
  paymentRequestId: string;

  partnerUserId: string;
  brandId: string;

  type: JobType;
  status: JobStatus;

  timestamp: string; // ISO string

  retryCount?: number;
  failureReason?: JobFailureReason | null;
  errorMessage?: string | null;

  meta?: Record<string, unknown>;
}

@Injectable()
export class AwsNOCSqsService {
  private readonly sqs: AWS.SQS;
  private readonly logger = new Logger(AwsNOCSqsService.name);

  constructor() {
    this.sqs = new AWS.SQS({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "ap-south-1",
    });
  }

  async sendToNOCQueue(messageBody: JobTrackingPayload): Promise<void> {
    // Skip if SQS queue URL is not configured
    if (!process.env.SQS_QUEUE_URL) {
      this.logger.warn(
        `SQS_QUEUE_URL not configured. Skipping NOC queue message: ${messageBody.trackingId}`,
      );
      return;
    }

    try {
      const params = {
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageBody: safeStringify(messageBody),
      };

      await this.sqs.sendMessage(params).promise();
      this.logger.log(`Message sent to NOC queue: ${messageBody.trackingId}`);
    } catch (error) {
      throw new BadRequestException(
        error.message || "Failed to queue NOC processing",
      );
    }
  }

  async pollNOCQueue(maxMessages: number = 1): Promise<any[]> {
    // Skip if SQS queue URL is not configured
    if (!process.env.SQS_QUEUE_URL) {
      this.logger.warn("SQS_QUEUE_URL not configured. Skipping queue poll");
      return [];
    }

    try {
      const params = {
        QueueUrl: process.env.SQS_QUEUE_URL,
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

  async deleteNOCMessage(receiptHandle: string): Promise<void> {
    // Skip if SQS queue URL is not configured
    if (!process.env.SQS_QUEUE_URL) {
      this.logger.warn(
        "SQS_QUEUE_URL not configured. Skipping message deletion",
      );
      return;
    }

    try {
      const params = {
        QueueUrl: process.env.SQS_QUEUE_URL,
        ReceiptHandle: receiptHandle,
      };

      await this.sqs.deleteMessage(params).promise();
    } catch (error) {
      this.logger.error("Error deleting SQS message:", error);
      throw error;
    }
  }
}
