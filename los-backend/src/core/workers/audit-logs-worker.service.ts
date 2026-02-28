import { Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import {
  AwsAuditLogsSqsService,
  AuditLogPayload,
} from "../aws/sqs/aws-audit-logs-sqs.service"; // SQS operations
import { PrismaService } from "src/prisma/prisma.service";
import { v4 as uuidv4 } from "uuid";
@Injectable()
export class AuditLogsWorkerService implements OnModuleInit {
  private readonly logger = new Logger(AuditLogsWorkerService.name);
  private isPolling = true;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly awsAuditLogsSqsService: AwsAuditLogsSqsService,
  ) {}

  async onModuleInit() {
    this.startPolling();
  }

  private async startPolling() {
    this.logger.log("🚀 Audit Logs Worker started polling...");

    while (this.isPolling) {
      try {
        await this.processPendingAuditLogs();
        await this.sleep(10000); // Poll every 10 seconds
      } catch (error) {
        this.logger.error("Error in Audit Logs worker:", error);
        await this.sleep(30000); // Wait 30 seconds on error
      }
    }
  }

  private async processPendingAuditLogs() {
    try {
      if (!this.awsAuditLogsSqsService) {
        this.logger.warn(
          "⚠️ AwsAuditLogsSqsService is not configured. SQS_AUDIT_LOGS_QUEUE_URL environment variable is missing.",
        );
        return;
      }

      const messages = await this.awsAuditLogsSqsService.pollAuditLogsQueue(1);

      if (messages.length === 0) {
        return;
      }

      for (const message of messages) {
        await this.processAuditLogMessage(message);
      }
    } catch (error) {
      this.logger.error("Error processing audit log messages:", error);
    }
  }

  private async processAuditLogMessage(message: {
    Body: string;
    ReceiptHandle: string;
  }) {
    let messageBody: AuditLogPayload;
    try {
      messageBody =
        typeof message.Body === "string"
          ? JSON.parse(message.Body)
          : message.Body;
      // Validate and normalize payload
      const validatedData = this.validateAndNormalizePayload(messageBody);

      // Create or update audit log (upsert to handle duplicate messages)
      const auditLog = await this.prisma.user_audit_logs.create({
        data: validatedData,
      });

      this.logger.log(
        `✅ Audit log stored: ID=${auditLog.id}, user=${auditLog.userId} - message="${auditLog.platformType}"`,
      );

      // Delete from queue
      await this.awsAuditLogsSqsService?.deleteAuditLogMessage(
        message.ReceiptHandle,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error: ${errorMessage}`);

      // Delete message even on error
      try {
        await this.awsAuditLogsSqsService?.deleteAuditLogMessage(
          message.ReceiptHandle,
        );
      } catch (deleteError) {
        this.logger.error(
          "Failed to delete message:",
          deleteError instanceof Error ? deleteError.message : deleteError,
        );
      }
    }
  }

  private validateAndNormalizePayload(messageBody: AuditLogPayload) {
    // 1. Validate userId (required)
    if (!messageBody.userId || typeof messageBody.userId !== "string") {
      throw new TypeError("Invalid userId: must be non-empty string");
    }

    // 2. Validate message (required)
    if (!messageBody.message || typeof messageBody.message !== "string") {
      throw new TypeError("Invalid message: must be non-empty string");
    }

    // 3. Validate optional strings
    const partnerUserId = this.validateOptionalString(
      messageBody.partnerUserId,
    );
    const brandId = this.validateOptionalString(messageBody.brandId);
    const loanId = this.validateOptionalString(messageBody.loanId);
    const type = this.validateAndTruncateType(
      messageBody.type,
    );

    // 4. Validate context
    const context = this.validateContext(messageBody.context);

    return {
      id: uuidv4(),
      userId: messageBody.userId,
      message: messageBody.message.trim(),
      updatedAt: new Date(),
      partnerUserId,
      brandId,
      loanId,
      type,
      context,
    };
  }
  private validateOptionalString(value: any): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value !== "string") {
      throw new TypeError("Optional string field must be string or null");
    }
    return value || null;
  }

  private validateAndTruncateType(
    type: any,
  ): string | null {
    const validated = this.validateOptionalString(type);
    if (validated && validated.length > 64) {
 
      return validated.substring(0, 64);
    }
    return validated;
  }

  private validateContext(context: any): Record<string, any> {
    if (!context) {
      return {};
    }
    if (typeof context !== "object" || Array.isArray(context)) {
      throw new TypeError("Context must be object or null");
    }
    try {
      JSON.stringify(context);
      return context;
    } catch {
      throw new TypeError("Context must be JSON serializable");
    }
  }

  stopPolling() {
    this.isPolling = false;
    this.logger.log("Audit Logs Worker stopped");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
