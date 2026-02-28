import { Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import { AwsNOCSqsService, JobTrackingPayload } from "../aws/sqs/aws-noc-sqs.service"; // SQS operations
import { PartnerLoansService } from "../../app/partner/loans/partner.loans.service";
import { PrismaService } from "src/prisma/prisma.service";
import { loan_status_enum } from "@prisma/client";

@Injectable()
export class NocWorkerService implements OnModuleInit {
  private readonly logger = new Logger(NocWorkerService.name);
  private isPolling = true;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly awsNOCSqsService: AwsNOCSqsService,
    private readonly partnerLoansService: PartnerLoansService // Your existing service
  ) {}

  async onModuleInit() {
    this.startPolling();
  }

  private async startPolling() {
    this.logger.log("🚀 NOC Worker started polling...");

    while (this.isPolling) {
      try {
        await this.processPendingNOCs();
        await this.sleep(10000); // Poll every 10 seconds
      } catch (error) {
        this.logger.error("Error in NOC worker:", error);
        await this.sleep(30000); // Wait 30 seconds on error
      }
    }
  }

  private async processPendingNOCs() {
    try {
      if (!this.awsNOCSqsService) {
        this.logger.warn(
          "AwsNOCSqsService is not configured. SQS_QUEUE_URL environment variable is missing.",
        );
        return;
      }

      const messages = await this.awsNOCSqsService.pollNOCQueue(1);

      if (messages.length === 0) {
        return;
      }

      for (const message of messages) {
        await this.processNOCMessage(message);
      }
    } catch (error) {
      this.logger.error("Error processing NOC messages:", error);
    }
  }

  private async processNOCMessage(message: {
    Body: string;
    ReceiptHandle: string;
  }) {
    let messageBody: JobTrackingPayload;
    try {
      // Parse the Body string to get JobTrackingPayload object
      messageBody = typeof message.Body === "string" 
        ? JSON.parse(message.Body) 
        : message.Body;

      
      this.logger.log(`📝 Processing NOC for loan: ${messageBody.loanId}`,messageBody);

      // Verify brand config exists
      const brandConfig = await this.prisma.brandConfig.findFirst({
        where: {
          autoGenerateNOC: true,
        },
        select: { id: true },
      });

      if (!brandConfig) {
        throw new Error("No active brand found for NOC processing");
      }

      // Get the specific loan from the message
      const loan = await this.prisma.loan.findFirst({
        where: {
          id: messageBody.loanId,
          status: loan_status_enum.COMPLETED,
          // noDueCertificate: {
          //   is: {
          //     sentAt: null,
          //   },
          // },
        },
        select: { brandId: true, id: true, formattedLoanId: true },
      });

      if (!loan) {
        throw new Error(`Loan not found or already processed: ${messageBody.loanId}`);
      }
      // Step 1: Send NOC Email
      this.logger.log(`Sending NOC email for loan: ${loan.formattedLoanId}`);
      await this.partnerLoansService.sendNoDueCertificateEmail(
        loan.brandId,
        loan.id,
        messageBody?.partnerUserId || "",
        true
      );

      // Step 3: Delete message from queue after successful processing
      if (this.awsNOCSqsService) {
        await this.awsNOCSqsService.deleteNOCMessage(message.ReceiptHandle);
      }

      this.logger.log(`✅ NOC processed successfully for loan: ${loan.formattedLoanId}`);
    } catch (error) {
      this.logger.error(
        `❌ Error processing NOC message for loan ${messageBody?.loanId || "unknown"}:`,
        error
      );
      // Delete message from queue even on error to prevent infinite retries
      if (this.awsNOCSqsService) {
        await this.awsNOCSqsService.deleteNOCMessage(message.ReceiptHandle);
      }
    }
  }

  stopPolling() {
    this.isPolling = false;
    this.logger.log("NOC Worker stopped");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
