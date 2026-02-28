import { Injectable, Logger } from "@nestjs/common";
import * as AWS from "aws-sdk";
import { safeStringify } from "src/utils/json.util";

export const ReminderJobType = {
  PhoneVerification: "PhoneVerification",
  EmailVerification: "EmailVerification",
  LoanApplication: "LoanApplication",
  CurrentStatus: "CurrentStatus",
  LoanApplicationKyc: "LoanApplicationKyc",
  LoanApplicationPersonalInfo: "LoanApplicationPersonalInfo",
  LoanApplicationBankDetails: "LoanApplicationBankDetails",
  LoanApplicationEmploymentInfo: "LoanApplicationEmploymentInfo",
  LoanApplicationSelfie: "LoanApplicationSelfie",
  LoanApplicationAddressVerification: "LoanApplicationAddressVerification",
  LoanApplicationReview: "LoanApplicationReview",
  LoanApplicationSubmit: "LoanApplicationSubmit",
} as const;

export type ReminderJobType =
  typeof ReminderJobType[keyof typeof ReminderJobType];

export interface ReminderTrackingPayload {
  trackingId: string;
  loanId: string;
  userId: string;
  channel: "SMS" | "Email" | "WhatsApp" | "IVR" | "IVR+SMS"; // From user_reminders.channel
  timestamp: string;
  brandName: string;
  applicationLink: string;
  provider_message_id: string; // Dynamic template name for WhatsApp/communication providers
  
  // User details from users table
  userEmail: string;
  userPhoneNumber: string;
  userName: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isWhatsappVerified: boolean;
  
  // Additional context
  templateCode: ReminderJobType; // Template code from user_reminders
  payload: Record<string, any>; // Additional payload data
}

@Injectable()
export class AwsReminderSqsService {
  private readonly sqs: AWS.SQS;
  private readonly logger = new Logger(AwsReminderSqsService.name);

  constructor() {
    this.sqs = new AWS.SQS({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "ap-south-1",
    });
  }

  /**
   * Send a reminder message to the reminder queue
   */
  async sendToReminderQueue(
    messageBody: ReminderTrackingPayload
  ): Promise<void> {
    // Skip if SQS queue URL is not configured
    if (!process.env.SQS_REMINDER_QUEUE_URL) {
      this.logger.warn(
        `SQS_REMINDER_QUEUE_URL not configured. Skipping reminder queue message: ${messageBody.trackingId}`
      );
      return;
    }

    try {
      const params = {
        QueueUrl: process.env.SQS_REMINDER_QUEUE_URL,
        MessageBody: safeStringify(messageBody),
      };

      await this.sqs.sendMessage(params).promise();
      this.logger.log(
        `Reminder message sent to queue: ${messageBody.trackingId}`
      );
    } catch (error) {
      this.logger.error("Error sending reminder to queue:", error);
      throw error;
    }
  }

  /**
   * Send a batch of reminder messages to the queue
   */
  async sendBatchToReminderQueue(
    messages: ReminderTrackingPayload[]
  ): Promise<void> {
    // Skip if SQS queue URL is not configured
    if (!process.env.SQS_REMINDER_QUEUE_URL) {
      this.logger.warn(
        `SQS_REMINDER_QUEUE_URL not configured. Skipping batch reminder queue messages`
      );
      return;
    }

    try {
      const entries = messages.map((message, index) => ({
        Id: `${message.trackingId}-${index}`,
        MessageBody: JSON.stringify(message),
      }));

      const params = {
        QueueUrl: process.env.SQS_REMINDER_QUEUE_URL,
        Entries: entries,
      };

      const result = await this.sqs.sendMessageBatch(params).promise();

      if (result.Failed && result.Failed.length > 0) {
        this.logger.warn(
          `${result.Failed.length} reminder messages failed to send`
        );
      }

      this.logger.log(
        `Batch reminder messages sent: ${result.Successful?.length || 0} succeeded, ${result.Failed?.length || 0} failed`
      );
    } catch (error) {
      this.logger.error("Error sending batch reminders to queue:", error);
      throw error;
    }
  }

  /**
   * Poll the reminder queue for messages
   */
  async pollReminderQueue(maxMessages: number = 1): Promise<any[]> {
    // Skip if SQS queue URL is not configured
    if (!process.env.SQS_REMINDER_QUEUE_URL) {
      this.logger.warn(
        "SQS_REMINDER_QUEUE_URL not configured. Skipping queue poll"
      );
      return [];
    }

    try {
      const params = {
        QueueUrl: process.env.SQS_REMINDER_QUEUE_URL,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 300,
      };

      const data = await this.sqs.receiveMessage(params).promise();
      return data.Messages || [];
    } catch (error) {
      this.logger.error("Error polling reminder queue:", error);
      return [];
    }
  }

  /**
   * Delete a reminder message from the queue
   */
  async deleteReminderMessage(receiptHandle: string): Promise<void> {
    // Skip if SQS queue URL is not configured
    if (!process.env.SQS_REMINDER_QUEUE_URL) {
      this.logger.warn(
        "SQS_REMINDER_QUEUE_URL not configured. Skipping message deletion"
      );
      return;
    }

    try {
      const params = {
        QueueUrl: process.env.SQS_REMINDER_QUEUE_URL,
        ReceiptHandle: receiptHandle,
      };

      await this.sqs.deleteMessage(params).promise();
      this.logger.log("Reminder message deleted from queue");
    } catch (error) {
      this.logger.error("Error deleting reminder queue message:", error);
      throw error;
    }
  }

  /**
   * Delete batch of reminder messages from the queue
   */
  async deleteBatchReminderMessages(
    receiptHandles: string[]
  ): Promise<void> {
    // Skip if SQS queue URL is not configured
    if (!process.env.SQS_REMINDER_QUEUE_URL) {
      this.logger.warn(
        "SQS_REMINDER_QUEUE_URL not configured. Skipping batch message deletion"
      );
      return;
    }

    try {
      const entries = receiptHandles.map((handle, index) => ({
        Id: `${index}`,
        ReceiptHandle: handle,
      }));

      const params = {
        QueueUrl: process.env.SQS_REMINDER_QUEUE_URL,
        Entries: entries,
      };

      const result = await this.sqs
        .deleteMessageBatch(params)
        .promise();

      if (result.Failed && result.Failed.length > 0) {
        this.logger.warn(
          `${result.Failed.length} reminder messages failed to delete`
        );
      }

      this.logger.log(
        `Batch reminder messages deleted: ${result.Successful?.length || 0} succeeded, ${result.Failed?.length || 0} failed`
      );
    } catch (error) {
      this.logger.error("Error deleting batch reminder messages:", error);
      throw error;
    }
  }

  /**
   * Change message visibility timeout
   */
  async changeMessageVisibility(
    receiptHandle: string,
    visibilityTimeout: number = 300
  ): Promise<void> {
    // Skip if SQS queue URL is not configured
    if (!process.env.SQS_REMINDER_QUEUE_URL) {
      this.logger.warn(
        "SQS_REMINDER_QUEUE_URL not configured. Skipping visibility change"
      );
      return;
    }

    try {
      const params = {
        QueueUrl: process.env.SQS_REMINDER_QUEUE_URL,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: visibilityTimeout,
      };

      await this.sqs.changeMessageVisibility(params).promise();
      this.logger.log("Reminder message visibility changed");
    } catch (error) {
      this.logger.error("Error changing message visibility:", error);
      throw error;
    }
  }
}
