import { Injectable, Logger } from "@nestjs/common";
import { RazorpayAutoPayService } from "../provider/autopay/razorpay-autopay.service";
import { PrismaService } from "src/prisma/prisma.service";
import {
  Prisma,
  payment_autopay_transaction,
  TransactionStatusEnum,
  TransactionTypeEnum,
} from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
@Injectable()
export class AutopayService {
  private readonly logger = new Logger(AutopayService.name);

  constructor(
    private readonly razorpayAutoPayService: RazorpayAutoPayService,
    private readonly prismaService: PrismaService
  ) {}

  /**
   * Helper method to parse metadata from Json type
   */
  private parseMetadata(metadata: any): Record<string, any> {
    if (!metadata) {
      return {};
    }
    if (typeof metadata === "string") {
      return JSON.parse(metadata);
    }
    return metadata;
  }

  //  payment_autopay_transaction -create
  async createAutopayTransaction(data: {
    brandId: string;
    userId: string;
    loanId: string;
  }): Promise<payment_autopay_transaction> {
    try {
      const loan = await this.prismaService.loan.findUnique({
        where: { id: data.loanId },
        include: { repayment: true },
      });

      if (!loan) {
        throw new Error(`Loan with ID ${data.loanId} not found`);
      }

      const user = await this.prismaService.user.findUnique({
        where: { id: data.userId },
        select: {
          email: true,
          phoneNumber: true,
          userDetails: {
            select: {
              firstName: true,
              middleName: true,
              lastName: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error(`User with ID ${data.userId} not found`);
      }

      const fullName = [
        user.userDetails?.firstName,
        user.userDetails?.middleName,
        user.userDetails?.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      // Check if autopay consent already exists with SUCCESS status
      const existingConsent =
        await this.prismaService.paymentRequest.findUnique({
          where: {
            loanId_type: {
              loanId: data.loanId,
              type: TransactionTypeEnum.AUTOPAY_CONSENT,
            },
          },
        });

      if (existingConsent?.status === "SUCCESS") {
        throw new Error(
          `Autopay consent already exists and is successful for loan ${data.loanId}. Cannot create duplicate consent.`
        );
      }

      // Create new or update existing payment request
      let paymentRequest = existingConsent;

      if (!paymentRequest) {
        paymentRequest = await this.prismaService.paymentRequest.create({
          data: {
            userId: data.userId,
            loanId: data.loanId,
            brandId: data.brandId,
            type: TransactionTypeEnum.AUTOPAY_CONSENT,
            currency: "INR",
            status: "PENDING",
          },
        });
      } else if (paymentRequest.status !== "PENDING") {
        // Update status back to PENDING if it was in a different state
        paymentRequest = await this.prismaService.paymentRequest.update({
          where: { id: paymentRequest.id },
          data: {
            status: "PENDING",
            updatedAt: new Date(),
          },
        });
      }
      const payment_autopay_transaction_id = uuidv4();
      const authorizationData = {
        brandId: loan.brandId,
        userId: data.userId,
        loanId: data.loanId,
        paymentAutopayTransactionId: payment_autopay_transaction_id,
        paymentRequestId: paymentRequest.id,
        name: fullName,
        email: user.email || "",
        contact: user.phoneNumber || "",
        maxAmount: loan.repayment.totalObligation,
        expireAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        metadata: {
          userEmail: user.email,
          userContact: user.phoneNumber,
        },
      };

      const response =
        await this.razorpayAutoPayService.createAuthorization(
          authorizationData
        );
      if (!response?.id) {
        throw new Error("Failed to create authorization with Razorpay");
      }

      const autopayTransaction =
        await this.prismaService.payment_autopay_transaction.create({
          data: {
            id: payment_autopay_transaction_id,
            paymentRequestId: paymentRequest.id,
            status: "PENDING",
            maxAuthorizedAmount: loan.amount,
            currency: "INR",
            externalRef: response.id,
            metadata: JSON.stringify({
              ...response,
              loanId: data.loanId,
              userId: data.userId,
            }),
            responseData: {
              order_id: response.order_id,
              customer_id: response.customer_id,
              createdAt: new Date().toISOString(),
            },
          },
        });

      // Now store the autopay transaction ID and payment request ID back
      // This will be used in webhook notes
      authorizationData.paymentAutopayTransactionId = autopayTransaction.id;
      authorizationData.paymentRequestId = paymentRequest.id;

      return autopayTransaction;
    } catch (error) {
      this.logger.error(
        `Error creating autopay transaction: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }


 async createRecurringPayment(data: {
    loanId: string;
    amount: number;
    description?: string;
  }): Promise<{
    success: boolean;
    message: string;
    collectionTransactionId?: string;
  }> {
    try {
      // 1. Check if user has successful autopay consent
      const successfulConsent = await this.prismaService.paymentRequest.findFirst({
        where: {
          loanId: data.loanId,
          type: TransactionTypeEnum.AUTOPAY_CONSENT,
          status: TransactionStatusEnum.SUCCESS,
        },
        include: {
          payment_autopay_transaction: {
            where: {
              status: TransactionStatusEnum.SUCCESS,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          loan: {
            include: {
              user: true,
              repayment: true,
            },
          },
        },
      });

      if (!successfulConsent) {
        throw new Error(`No successful autopay consent found for loan ${data.loanId}`);
      }

      const autopayTransaction = successfulConsent.payment_autopay_transaction[0];
      if (!autopayTransaction) {
        throw new Error(`No successful autopay transaction found for loan ${data.loanId}`);
      }

      // 2. Extract token and customer details from autopay transaction
      const responseData = this.parseMetadata(autopayTransaction.responseData);
      const tokenId = responseData.tokenId;
      const customerId = responseData.customerId;

      if (!tokenId || !customerId) {
        throw new Error(`Missing token or customer details for recurring payment`);
      }

      // 3. Validate amount doesn't exceed max authorized amount
      // const maxAmount = parseFloat(autopayTransaction.maxAuthorizedAmount.toString());
      // if (data.amount > maxAmount) {
      //   throw new Error(`Amount ${data.amount} exceeds maximum authorized amount ${maxAmount}`);
      // }

      // 4. Generate receipt ID
      const receiptId = `REC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 5. Create payment collection transaction with PENDING status
      const collectionTransactionId = uuidv4();
      const collectionTransaction = await this.prismaService.paymentCollectionTransaction.create({
        data: {
          id: collectionTransactionId, // Required: provide UUID for primary key
          paymentRequestId: successfulConsent.id,
          status: TransactionStatusEnum.PENDING,
          amount: new Prisma.Decimal(data.amount),
          currency: "INR",
          receiptId: receiptId,
          principalAmount: data.amount,
          note: data.description || `Recurring payment via UPI autopay`,
          paymentDetails: {
            paymentMethod: "UPI_AUTOPAY",
            source: "recurring_payment",
            loanId: data.loanId,
            userId: successfulConsent.userId,
            autopayTransactionId: autopayTransaction.id,
          } as Prisma.JsonValue,
        },
      });

      // 6. Call Razorpay to initiate recurring payment
      const user = successfulConsent.loan.user;
      const razorpayResponse = await this.razorpayAutoPayService.createRecurringPayment({
        userId: successfulConsent.userId,
        loanId: data.loanId,
        amount: data.amount,
        dueDate: new Date(),
        description: data.description || `Loan repayment for loan ${data.loanId}`,
        email: user.email || "",
        contact: user.phoneNumber || "",
        tokenId: tokenId,
        customerId: customerId,
        paymentRequestId: successfulConsent.id,
      });

      // 7. Update collection transaction with external reference
      await this.prismaService.paymentCollectionTransaction.update({
        where: { id: collectionTransaction.id },
        data: {
          externalRef: razorpayResponse.paymentId || `razorpay_${Date.now()}`,
        },
      });

      this.logger.log(`Recurring payment initiated for loan ${data.loanId}: ${collectionTransaction.id}`);

      return {
        success: true,
        message: "Recurring payment initiated successfully",
        collectionTransactionId: collectionTransaction.id,
      };
    } catch (error) {
      this.logger.error(
        `Error creating recurring payment: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }


  /**
   * Handle Razorpay Autopay webhook events
   * Processes payment.failed and payment.authorized events
   */
  async handleRazorpayAutopayWebhook(data: any): Promise<{
    status: string;
    event?: string;
    message?: string;
  }> {
    try {
      const event = data.event;
      const payload = data.payload;

      this.logger.log(`Processing Razorpay webhook event: ${event}`);

      switch (event) {
        case "payment.authorized":
          return await this.handlePaymentAuthorized(payload);

        case "payment.failed":
          return await this.handlePaymentFailed(payload);

        case "payment.captured":
          return await this.handlePaymentCaptured(payload);

        case "token.confirmed":
          return await this.handleTokenConfirmed(payload);

        default:
          this.logger.warn(`Unhandled webhook event: ${event}`);
          return {
            status: "ignored",
            event,
            message: "Event type not handled",
          };
      }
    } catch (error) {
      this.logger.error(
        `Error handling Razorpay webhook: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Handle payment.authorized event
   * Updates autopay transaction and payment request status
   */
  private async handlePaymentAuthorized(payload: any): Promise<{
    status: string;
    message: string;
  }> {
    try {
      // Correct extraction from Razorpay webhook
      const payment = payload?.payment?.entity;

      if (!payment) {
        throw new Error("Invalid webhook: payment entity missing");
      }

      this.logger.log(
        `Payment authorized: ${payment.id}, Token: ${payment.token_id}`
      );

      // Extract notes safely
      const notes = payment.notes || {};
      const paymentRequestId = notes.payment_request_id;
      const autopayTxnId = notes.payment_autopay_transaction_id;

      if (!paymentRequestId || !autopayTxnId) {
        this.logger.warn(
          `Missing identifiers in webhook notes for payment ${payment.id}`
        );
        return {
          status: "warning",
          message: "Missing payment request or autopay transaction ID",
        };
      }

      // Fetch autopay transaction
      const autopayTransaction =
        await this.prismaService.payment_autopay_transaction.findUnique({
          where: { id: autopayTxnId },
          include: { paymentRequest: true },
        });

      if (!autopayTransaction) {
        this.logger.warn(`Autopay transaction not found: ${autopayTxnId}`);
        return {
          status: "warning",
          message: "Autopay transaction not found",
        };
      }

      const metadataObj = this.parseMetadata(autopayTransaction.metadata);

      // Razorpay sometimes puts VPA inside payment.upi.vpa
      const vpa = payment.vpa || payment?.upi?.vpa || null;

      // Update autopay transaction
      await this.prismaService.payment_autopay_transaction.update({
        where: { id: autopayTransaction.id },
        data: {
          status: TransactionStatusEnum.SUCCESS,
          completedAt: new Date(),
          responseData: {
            ...metadataObj,
            razorpayPaymentId: payment.id,
            tokenId: payment.token_id,
            customerId: payment.customer_id,
            orderId: payment.order_id,
            invoiceId: payment.invoice_id,
            acquirerRrn: payment.acquirer_data?.rrn,
            vpa,
            authorizedAt: new Date().toISOString(),
          },
        },
      });

      // Update payment request as SUCCESS
      await this.prismaService.paymentRequest.update({
        where: { id: paymentRequestId },
        data: {
          status: TransactionStatusEnum.SUCCESS,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Payment authorized processed successfully: ${payment.id}`
      );

      return {
        status: "success",
        message: "Payment authorized. Autopay transaction updated.",
      };
    } catch (error) {
      this.logger.error(
        `Error in payment.authorized handler: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Handle payment.failed event
   * Updates autopay transaction and payment request status
   */
private async handlePaymentFailed(payload: any): Promise<{
    status: string;
    message: string;
  }> {
    try {
      const payment = payload?.payment?.entity;

      if (!payment) {
        throw new Error("Invalid webhook: payment entity missing");
      }

      this.logger.warn(
        `Payment failed: ${payment.id}, Error: ${payment.error_description}`
      );

      const notes = payment.notes || {};
      const paymentRequestId = notes.payment_request_id;

      if (!paymentRequestId) {
        this.logger.warn(
          `Missing payment_request_id in notes for payment ${payment.id}`
        );
        return {
          status: "warning",
          message: "Missing payment request ID in webhook",
        };
      }

      // Find the latest PENDING collection transaction for this payment request
      const collectionTransaction = await this.prismaService.paymentCollectionTransaction.findFirst({
        where: {
          paymentRequestId: paymentRequestId,
          status: TransactionStatusEnum.PENDING,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!collectionTransaction) {
        this.logger.warn(`No pending collection transaction found for payment request: ${paymentRequestId}`);
        return {
          status: "warning",
          message: "No pending collection transaction found",
        };
      }

      // Update collection transaction status to FAILED
      const paymentDetails = collectionTransaction.paymentDetails 
        ? this.parseMetadata(collectionTransaction.paymentDetails)
        : {};

      await this.prismaService.paymentCollectionTransaction.update({
        where: { id: collectionTransaction.id },
        data: {
          status: TransactionStatusEnum.FAILED,
          failureReason: payment.error_description || payment.error_reason || "Unknown error",
          paymentDetails: {
            ...paymentDetails,
            razorpayPaymentId: payment.id,
            errorCode: payment.error_code,
            errorDescription: payment.error_description,
            errorSource: payment.error_source,
            errorStep: payment.error_step,
            errorReason: payment.error_reason,
            failedAt: new Date().toISOString(),
          } as Prisma.JsonValue,
        },
      });

      this.logger.warn(
        `Recurring payment FAILED recorded: ${payment.id}. Collection transaction ${collectionTransaction.id} updated to FAILED.`
      );

      return {
        status: "success",
        message: "Payment failure recorded",
      };
    } catch (error) {
      this.logger.error(
        `Error in payment.failed handler for recurring payment: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Handle payment.captured event
   * Updates autopay transaction status when payment is captured
   */
 private async handlePaymentCaptured(payload: any): Promise<{
    status: string;
    message: string;
  }> {
    try {
      const payment = payload.payment?.entity;

      if (!payment) {
        throw new Error("Invalid payment data in webhook");
      }

      this.logger.log(`Payment captured: ${payment.id}`);

      const notes = payment.notes || {};
      const paymentRequestId = notes.payment_request_id;

      if (!paymentRequestId) {
        this.logger.warn(
          `Missing payment request ID in webhook notes for payment ${payment.id}`
        );
        // Try to find by externalRef
        const collectionTransaction = await this.prismaService.paymentCollectionTransaction.findFirst({
          where: {
            externalRef: payment.id,
          },
        });

        if (!collectionTransaction) {
          return {
            status: "warning",
            message: "Missing payment request ID in webhook",
          };
        }

        await this.updateCollectionTransactionStatus(collectionTransaction.id, payment);
        return {
          status: "success",
          message: "Payment captured successfully",
        };
      }

      // Find the latest PENDING collection transaction for this payment request
      const collectionTransaction = await this.prismaService.paymentCollectionTransaction.findFirst({
        where: {
          paymentRequestId: paymentRequestId,
          status: TransactionStatusEnum.PENDING,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!collectionTransaction) {
        this.logger.warn(`No pending collection transaction found for payment request: ${paymentRequestId}`);
        return {
          status: "warning",
          message: "No pending collection transaction found",
        };
      }

      // Update collection transaction status to SUCCESS
      await this.updateCollectionTransactionStatus(collectionTransaction.id, payment);

      this.logger.log(`Recurring payment captured and recorded: ${payment.id}`);

      return {
        status: "success",
        message: "Payment captured successfully",
      };
    } catch (error) {
      this.logger.error(
        `Error handling payment.captured: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }


  private async updateCollectionTransactionStatus(transactionId: string, payment: any): Promise<void> {
    const existingTransaction = await this.prismaService.paymentCollectionTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!existingTransaction) {
      throw new Error(`Collection transaction not found: ${transactionId}`);
    }

    const paymentDetails = existingTransaction.paymentDetails 
      ? this.parseMetadata(existingTransaction.paymentDetails)
      : {};

    await this.prismaService.paymentCollectionTransaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatusEnum.SUCCESS,
        completedAt: new Date(),
        externalRef: payment.id,
        paymentDetails: {
          ...paymentDetails,
          razorpayPaymentId: payment.id,
          orderId: payment.order_id,
          customerId: payment.customer_id,
          tokenId: payment.token_id,
          method: payment.method,
          vpa: payment.vpa,
          capturedAt: new Date().toISOString(),
          capturedAmount: payment.amount / 100, // Convert from paise to rupees
        } as Prisma.JsonValue,
      },
    });
  }

  /**
   * Handle token.confirmed event
   * Records UPI token confirmation for future recurring payments
   */
  private async handleTokenConfirmed(payload: any): Promise<{
    status: string;
    message: string;
  }> {
    try {
      const token = payload.token?.entity;

      if (!token) {
        throw new Error("Invalid token data in webhook");
      }

      this.logger.log(
        `UPI Token confirmed: ${token.id}, VPA: ${token.vpa?.username}`
      );

      // Extract transaction ID from notes if available
      const notes = token.notes || {};
      const paymentAutopayTransactionId = notes.payment_autopay_transaction_id;

      // If we have the transaction ID, update it with token details
      if (paymentAutopayTransactionId) {
        const autopayTransaction =
          await this.prismaService.payment_autopay_transaction.findUnique({
            where: { id: paymentAutopayTransactionId },
          });

        if (autopayTransaction) {
          const metadataObj = this.parseMetadata(autopayTransaction.metadata);

          await this.prismaService.payment_autopay_transaction.update({
            where: { id: autopayTransaction.id },
            data: {
              responseData: {
                ...metadataObj,
                tokenId: token.id,
                vpa: token.vpa?.username,
                tokenStatus: token.status,
                tokenConfirmedAt: new Date().toISOString(),
              },
            },
          });
        }
      }

      this.logger.log(
        `Token ${token.id} confirmed for UPI VPA: ${token.vpa?.username}`
      );

      return {
        status: "success",
        message: "Token confirmed",
      };
    } catch (error) {
      this.logger.error(
        `Error handling token.confirmed: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
 * Check if user has successful autopay consent and pending collection
 */
async checkUserAutopayEligibility(data: {
  userId: string;
  loanId: string;
}): Promise<{
  eligible: boolean;
  message: string;
  autopayTransaction?: payment_autopay_transaction;
  pendingCollectionCount?: number;
}> {
  try {
    // 1. Check if user has successful autopay consent
    const successfulConsent = await this.prismaService.paymentRequest.findFirst({
      where: {
        loanId: data.loanId,
        userId: data.userId,
        type: TransactionTypeEnum.AUTOPAY_CONSENT,
        status: TransactionStatusEnum.SUCCESS,
      },
      include: {
        payment_autopay_transaction: {
          where: {
            status: TransactionStatusEnum.SUCCESS,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!successfulConsent) {
      return {
        eligible: false,
        message: `No successful autopay consent found for user ${data.userId} and loan ${data.loanId}`,
      };
    }

    const autopayTransaction = successfulConsent.payment_autopay_transaction[0];
    if (!autopayTransaction) {
      return {
        eligible: false,
        message: `No successful autopay transaction found for user ${data.userId} and loan ${data.loanId}`,
      };
    }

    // 2. Check if there are any PENDING collection transactions for this payment request
    const pendingCollections = await this.prismaService.paymentCollectionTransaction.findMany({
      where: {
        paymentRequestId: successfulConsent.id,
        status: TransactionStatusEnum.PENDING,
      },
    });

    const isEligible = pendingCollections.length > 0;

    return {
      eligible: isEligible,
      message: isEligible 
        ? `User has successful autopay and ${pendingCollections.length} pending collection(s)` 
        : `User has successful autopay but no pending collections`,
      autopayTransaction,
      pendingCollectionCount: pendingCollections.length,
    };
  } catch (error) {
    this.logger.error(
      `Error checking user autopay eligibility: ${error.message}`,
      error.stack
    );
    throw error;
  }
}
}
