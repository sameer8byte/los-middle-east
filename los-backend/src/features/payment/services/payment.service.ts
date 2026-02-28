import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import {
  PaytringPaymentStatus,
  PaytringService,
} from "../provider/paytring.service";
import { RazorpayService } from "../provider/razorpay.service";
import { CashfreeService } from "../provider/cashfree.service";
import { LoansService } from "src/features/loans/services/loans.services";
import {
  agreement_status_enum,
  BrandProviderType,
  closingTypeEnum,
  DocumentTypeEnum,
  loan_status_enum,
  notification_priority_enum,
  OpsApprovalStatusEnum,
  PartnerUser,
  PaymentMethodEnum,
  platform_type,
  ReloanStatus,
  TransactionStatusEnum,
  TransactionTypeEnum,
} from "@prisma/client";
import { generateReceiptId } from "src/utils";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { PartnerLoansService } from "src/app/partner/loans/partner.loans.service";
import { v4 as uuid } from "uuid";
import * as dayjs from "dayjs";
import { ICICIPriorityEnum } from "../dto/payment/icici-disbursement.dto";
import { ICICIProvider } from "../provider/icici.disbursement.service";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import { NotificationService } from "src/features/notification/notification.service";
import { getRoleId, RoleEnum } from "src/constant/roles";
import { SmsService } from "src/core/communication/services/sms.service";
import {
  FundTransferRequest,
  TransferTypeEnum,
} from "../dto/payment/idfc-disbursement.dto";
import { IDFCProvider } from "../provider/idfc.disbursement.service";
import { PartnerUserSecureCodeService } from "src/app/partner/users/partner-user-secure-code.service";
import { AwsNOCSqsService } from "src/core/aws/sqs/aws-noc-sqs.service";
import { AwsAuditLogsSqsService } from "src/core/aws/sqs/aws-audit-logs-sqs.service";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paytring: PaytringService,
    private readonly razorpay: RazorpayService,
    private readonly cashfree: CashfreeService,
    private readonly loansService: LoansService,
    private readonly awsS3Service: AwsPublicS3Service,
    @Optional() private readonly awsNOCSqsService: AwsNOCSqsService,
    @Optional() private readonly awsAuditLogsSqsService: AwsAuditLogsSqsService,
    private readonly partnerLoansService: PartnerLoansService,
    private readonly notificationService: NotificationService,
    private readonly smsService: SmsService,
    private readonly idfcProvider: IDFCProvider,
    private readonly partnerUserSecureCodeService: PartnerUserSecureCodeService,
    private readonly iciciProvider: ICICIProvider,
  ) {}

  private async createPaymentOrder(params: {
    paymentRequestId: string;
    paymentTransactionId: string;
    amount: number;
    fullName: string;
    phoneNumber: string;
    panNumber: string;
    loanId: string;
    receiptId: string;
    platformType: platform_type;
    transactionType: TransactionTypeEnum;
    method: PaymentMethodEnum;
    formattedUserId: string;
    formattedLoanId: string;
    web_hostname: string;
    userId: string;
  }) {
    const {
      paymentRequestId,
      paymentTransactionId,
      amount,
      fullName,
      phoneNumber,
      panNumber,
      loanId,
      receiptId,
      platformType,
      transactionType,
      method,
      userId,
      web_hostname,
      formattedLoanId,
    } = params;
    if (method === PaymentMethodEnum.PAYTERNING) {
      return this.paytring.createOrder(
        paymentRequestId,
        paymentTransactionId,
        amount,
        fullName,
        phoneNumber,
        panNumber,
        loanId,
        receiptId,
        platformType,
        transactionType,
        userId,
        web_hostname,
      );
    } else if (method === PaymentMethodEnum.RAZORPAY) {
      return this.razorpay.createOrder(
        paymentRequestId,
        paymentTransactionId,
        amount,
        fullName,
        phoneNumber,
        panNumber,
        loanId,
        receiptId,
        platformType,
        transactionType,
        params.formattedUserId,
        params.formattedLoanId,
        userId,
        web_hostname,
      );
    } else if (method === PaymentMethodEnum.CASHFREE) {
      return this.cashfree.createOrder(
        paymentRequestId,
        paymentTransactionId,
        amount,
        fullName,
        phoneNumber,
        panNumber,
        loanId,
        receiptId,
        platformType,
        transactionType,
        userId,
        web_hostname,
        formattedLoanId,
      );
    }

    throw new BadRequestException(`Unsupported payment method: ${method}`);
  }

  async createCollectionPayment(
    loanId: string,
    userId: string,
    method: PaymentMethodEnum,
  ) {
    const pan = await this.prisma.document.findFirst({
      where: {
        userId,
        type: DocumentTypeEnum.PAN,
      },
      select: {
        id: true,
        documentNumber: true,
      },
    });

    if (!pan) {
      throw new BadRequestException(
        "Approved PAN document not found for the user.",
      );
    }

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        user: {
          include: {
            brandSubDomain: true,
            userDetails: true,
          },
        },
        brand: {
          include: { brand_sub_domains: true },
        },
        loanDetails: true,
      },
    });
    if (!loan) {
      throw new NotFoundException("Loan not found for the provided loan ID.");
    }

    if (loan.userId !== userId) {
      throw new ForbiddenException("You do not have access to this loan.");
    }

    if (
      loan.disbursementDate &&
      loan.loanDetails?.minActiveRepaymentDays &&
      _dayjs()
        .startOf("day")
        .isBefore(
          _dayjs(loan.disbursementDate)
            .add(loan.loanDetails.minActiveRepaymentDays, "day")
            .startOf("day"),
        )
    ) {
      const disbursementDate = _dayjs(loan.disbursementDate).format(
        "YYYY-MM-DD",
      );
      const earliestPaymentDate = _dayjs(loan.disbursementDate)
        .add(loan.loanDetails.minActiveRepaymentDays, "day")
        .format("YYYY-MM-DD");

      throw new BadRequestException(
        `Loan cannot be paid before ${loan.loanDetails.minActiveRepaymentDays} days from the disbursement date.\n` +
          `Disbursement Date: ${disbursementDate}\n` +
          `Earliest Allowed Payment Date: ${earliestPaymentDate}`,
      );
    }

    // Step 4: Get pending repayment info
    const pendingPayments = await this.loansService.currentRepayment(
      userId,
      loanId,
      _dayjs(),
    );

    // Step 5: Upsert payment request
    const payment = await this.prisma.paymentRequest.upsert({
      where: {
        loanId_type: {
          loanId,
          type: TransactionTypeEnum.COLLECTION,
        },
      },
      create: {
        loanId,
        brandId: loan.brandId,
        userId,
        type: TransactionTypeEnum.COLLECTION,
        status: TransactionStatusEnum.PENDING,
      },
      update: {
        status: TransactionStatusEnum.PENDING,
      },
    });

    const existingTransaction =
      await this.prisma.paymentCollectionTransaction.findFirst({
        where: {
          paymentRequestId: payment.id,
          status: TransactionStatusEnum.SUCCESS,
          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
    if (existingTransaction) {
      throw new BadRequestException(
        "Payment transaction already exists for this payment request with status SUCCESS.",
      );
    }

    // Determine if we need to generate a payment link
    const generatePaymentLink = method !== PaymentMethodEnum.MANUAL;

    const paymentTransaction =
      await this.prisma.paymentCollectionTransaction.create({
        data: {
          id: uuid(),
          paymentRequestId: payment.id,
          status: TransactionStatusEnum.PENDING,
          currency: "INR",
          externalRef: null,
          retryCount: 0,
          failureReason: null,
          completedAt: null,
          updatedAt: new Date(),
          externalUrl: null,
          paymentLink: null,
          receiptId: generateReceiptId(),
          platformType: platform_type.WEB,
          method: method,
          note: `Payment initiated via ${method}`,
          paymentDetails: pendingPayments,
          principalAmount: +pendingPayments.totals.principalAmount,
          totalFees: +pendingPayments.totals.totalFees,
          totalTaxes: +pendingPayments.totals.totalTaxes,
          totalPenalties: +pendingPayments.totals.totalPenalties,
          amount: pendingPayments.totalRepayment,
          pct_loan_id: loan.id,
        },
      });

    const parts = [
      loan.user.userDetails.firstName,
      loan.user.userDetails.middleName,
      loan.user.userDetails.lastName,
    ].filter(Boolean);
    const fullName = parts.join(" ");
    let createOrder = null;
    if (generatePaymentLink) {
      const domain =
        loan.user.brandSubDomain?.subdomain ||
        loan.brand?.brand_sub_domains?.[0]?.subdomain;
      createOrder = await this.createPaymentOrder({
        paymentRequestId: payment.id,
        paymentTransactionId: paymentTransaction.id,
        amount: Number(paymentTransaction.amount),
        fullName: fullName,
        phoneNumber: loan.user.phoneNumber,
        panNumber: pan.documentNumber,
        loanId: loan.id,
        receiptId: paymentTransaction.receiptId,
        platformType: platform_type.WEB,
        transactionType: TransactionTypeEnum.COLLECTION,
        method: method,
        formattedUserId: loan.user.formattedUserId,
        formattedLoanId: loan.formattedLoanId,
        web_hostname: `${domain}`,
        userId: loan.userId,
      });
      let isValidResponse = false;
      let paymentLink = null;
      let externalRefValue = null;
      let externalUrlValue = null;

      if (method === PaymentMethodEnum.PAYTERNING) {
        isValidResponse = !!(createOrder?.order_id && createOrder?.status);
        if (isValidResponse) {
          externalRefValue = createOrder.order_id;
          externalUrlValue = createOrder.url;
          paymentLink = Buffer.from(createOrder.url, "base64").toString(
            "utf-8",
          );
        }
      } else if (method === PaymentMethodEnum.RAZORPAY) {
        isValidResponse = !!(createOrder?.payment_link_id && createOrder?.url);
        if (isValidResponse) {
          externalRefValue = createOrder.payment_link_id;
          externalUrlValue = createOrder.url;
          paymentLink = createOrder.url;
        }
      } else if (method === PaymentMethodEnum.CASHFREE) {
        isValidResponse = !!(createOrder?.payment_link_id && createOrder?.url);
        if (isValidResponse) {
          externalRefValue = "-"; // Cashfree does not provide a specific externalRef
          externalUrlValue = createOrder.url;
          paymentLink = createOrder.url;
        }
      }

      if (!isValidResponse) {
        await this.prisma.paymentCollectionTransaction.update({
          where: { id: paymentTransaction.id },
          data: {
            status: TransactionStatusEnum.FAILED,
            failureReason: `Failed to create payment order with ${method}. Response: ${JSON.stringify(createOrder)}`,
          },
        });
        throw new InternalServerErrorException(
          `Failed to create payment order with ${method}.`,
        );
      }

      // Update transaction with payment gateway data
      await this.prisma.paymentCollectionTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          externalRef: externalRefValue,
          externalUrl: externalUrlValue,
          paymentLink: paymentLink,
        },
      });
    }

    const updateTransaction =
      await this.prisma.paymentCollectionTransaction.findUnique({
        where: { id: paymentTransaction.id },
      });

    return updateTransaction;
  }

  async handlePaytringCallback(callbackBody: {
    key: string;
    receipt_id: string;
    order_id: string;
    hash: string;
  }) {
    this.logger.log(
      `📥 Paytring callback received: ${JSON.stringify(callbackBody)}`,
    );

    if (!callbackBody || Object.keys(callbackBody).length === 0) {
      this.logger.error("❌ Empty callback body received");
      throw new BadRequestException("Invalid callback body");
    }

    const { order_id: externalRef } = callbackBody;

    if (!externalRef) {
      this.logger.error("❌ order_id missing in callback body");
      throw new BadRequestException(
        "Order ID (externalRef) is required in callback body",
      );
    }

    this.logger.log(
      `🔎 Fetching Paytring order for externalRef=${externalRef}`,
    );

    const orderDetails = await this.paytring.fetchOrder(externalRef);

    this.logger.debug(
      `💥 Paytring Order Details: ${JSON.stringify(orderDetails)}`,
    );

    const notes = orderDetails.order?.notes || orderDetails.notes;
    const requiredFields = ["udf1", "udf2", "udf3", "udf4", "udf5", "udf6"];

    for (const field of requiredFields) {
      if (!notes?.[field]) {
        this.logger.error(
          `❌ Missing ${field} in Paytring order notes for externalRef=${externalRef}`,
        );
        throw new NotFoundException(`${field} is missing in order notes.`);
      }
    }

    const loanId = notes.udf2;
    const paymentRequestId = notes.udf3;
    const paymentTransactionId = notes.udf4;
    const platformType = notes.udf5 as platform_type;
    const transactionType = notes.udf6 as TransactionTypeEnum;

    this.logger.log(
      `🧾 Parsed notes | loanId=${loanId}, paymentRequestId=${paymentRequestId}, transactionId=${paymentTransactionId}, transactionType=${transactionType}`,
    );

    const transactionRelation =
      transactionType === TransactionTypeEnum.COLLECTION
        ? "collectionTransactions"
        : transactionType === TransactionTypeEnum.PARTIAL_COLLECTION
          ? "partialCollectionTransactions"
          : null;

    if (!transactionRelation) {
      this.logger.error(
        `❌ Unsupported transaction type received: ${transactionType}`,
      );
      throw new BadRequestException(
        `Unsupported transaction type: ${transactionType}`,
      );
    }

    this.logger.log(
      `🔎 Fetching paymentRequest=${paymentRequestId} with relation=${transactionRelation}`,
    );

    const paymentRequest = await this.prisma.paymentRequest.findFirst({
      where: {
        id: paymentRequestId,
        loanId,
        type: transactionType,
        status: {
          not: TransactionStatusEnum.SUCCESS, // Ensure we only fetch if payment request is not already SUCCESS
        },
      },
      include: {
        [transactionRelation]: {
          where: {
            id: paymentTransactionId,
            status: {
              not: TransactionStatusEnum.SUCCESS, // Ensure we only fetch if not already SUCCESS
            },
          },
        },
      },
    });

    // @ts-ignore
    const transactions = paymentRequest?.[transactionRelation];

    if (!paymentRequest || transactions?.length === 0) {
      this.logger.error(
        `❌ No transaction found | loanId=${loanId}, paymentRequestId=${paymentRequestId}, transactionId=${paymentTransactionId}`,
      );
      throw new NotFoundException(
        `No payment transaction found for loan ${loanId} with externalRef ${externalRef}`,
      );
    }

    const status = orderDetails?.order?.order_status;

    if (!status) {
      this.logger.error(
        `❌ order_status missing from Paytring response for externalRef=${externalRef}`,
      );
      throw new NotFoundException("Order details not found in Paytring.");
    }

    this.logger.log(
      `📦 Paytring order status=${status} for externalRef=${externalRef}`,
    );

    const statusMap: Record<string, TransactionStatusEnum> = {
      [PaytringPaymentStatus.SUCCESS]: TransactionStatusEnum.SUCCESS,
      [PaytringPaymentStatus.FAILED]: TransactionStatusEnum.FAILED,
      [PaytringPaymentStatus.PENDING]: TransactionStatusEnum.PENDING,
    };

    const transactionUpdateData: Partial<{
      status: TransactionStatusEnum;
      failureReason: string;
      completedAt: Date;
    }> = {
      status: statusMap[status] || TransactionStatusEnum.FAILED,
    };

    if (status === PaytringPaymentStatus.SUCCESS) {
      transactionUpdateData.completedAt = new Date();
      this.logger.log(
        `✅ Transaction SUCCESS for transactionId=${paymentTransactionId}`,
      );
    } else if (status === PaytringPaymentStatus.FAILED) {
      transactionUpdateData.failureReason = "Payment failed in Paytring.";
      this.logger.warn(
        `❌ Transaction FAILED for transactionId=${paymentTransactionId}`,
      );
    } else if (!statusMap[status]) {
      transactionUpdateData.failureReason = `Unexpected order status: ${status}`;
      this.logger.error(
        `❌ Unexpected Paytring status=${status} for externalRef=${externalRef}`,
      );
      throw new InternalServerErrorException(
        `Unexpected order status from Paytring: ${status}`,
      );
    }

    if (transactionType === TransactionTypeEnum.COLLECTION) {
      this.logger.log(
        `📝 Updating COLLECTION transaction ${paymentTransactionId}`,
      );

      await this.prisma.paymentCollectionTransaction.update({
        where: { id: paymentTransactionId },
        data: transactionUpdateData,
      });
    } else if (transactionType === TransactionTypeEnum.PARTIAL_COLLECTION) {
      this.logger.log(
        `📝 Updating PARTIAL_COLLECTION transaction ${paymentTransactionId}`,
      );

      const paymentPartialCollectionTransaction =
        await this.prisma.paymentPartialCollectionTransaction.update({
          where: { id: paymentTransactionId },
          data: transactionUpdateData,
        });

      if (
        paymentPartialCollectionTransaction.isPaymentComplete &&
        paymentPartialCollectionTransaction.paymentRequestId
      ) {
        this.logger.log(
          `🎉 Partial payments complete. Marking paymentRequest=${paymentPartialCollectionTransaction.paymentRequestId} as SUCCESS`,
        );

        await this.prisma.paymentRequest.update({
          where: { id: paymentPartialCollectionTransaction.paymentRequestId },
          data: { status: TransactionStatusEnum.SUCCESS },
        });
      }
    }

    this.logger.log(
      `✅ Paytring callback processed successfully for externalRef=${externalRef}`,
    );

    return {
      success: status === PaytringPaymentStatus.SUCCESS,
      message: `Payment ${status.toLowerCase()} for transaction ${paymentTransactionId}`,
    };
  }

  async handleRazorpayCallback(data: any) {
    if (!data) {
      throw new BadRequestException("Invalid callback body");
    }
    const { event, payload } = data;
    if (event === "payment.captured") {
      return this.handleRazorpayPaymentCaptured(payload.payment.entity);
    } else if (event === "payment.failed") {
      return this.handleRazorpayPaymentFailed(payload.payment.entity);
    } else if (event === "payment_link.paid") {
      return this.handleRazorpayPaymentLinkPaid(payload.payment_link.entity);
    } else if (event === "payment_link.cancelled") {
      return this.handleRazorpayPaymentLinkCancelled(
        payload.payment_link.entity,
      );
    } else {
      return { status: "ignored", event };
    }
  }

  private async handleRazorpayPaymentLinkPaid(paymentLink: any) {
    try {
      const { id: paymentLinkId, status } = paymentLink;

      // Get complete payment link details from Razorpay API
      const paymentLinkDetails =
        await this.razorpay.fetchPaymentLink(paymentLinkId);

      const notes = paymentLinkDetails.notes;
      if (!notes) {
        throw new NotFoundException("Notes not found in payment link details");
      }

      const requiredFields = [
        "loan_id",
        "payment_request_id",
        "payment_transaction_id",
        "transaction_type",
      ];
      for (const field of requiredFields) {
        if (!notes[field]) {
          throw new NotFoundException(
            `${field} is missing in payment link notes.`,
          );
        }
      }

      const loanId = notes.loan_id;
      const paymentRequestId = notes.payment_request_id;
      const paymentTransactionId = notes.payment_transaction_id;
      const transactionType = notes.transaction_type as TransactionTypeEnum;

      // Check if loan ops status is already SUCCESS
      if (paymentTransactionId) {
        if (transactionType === TransactionTypeEnum.COLLECTION) {
          const existingTransaction =
            await this.prisma.paymentCollectionTransaction.findUnique({
              where: { id: paymentTransactionId },
              select: { opsApprovalStatus: true },
            });

          if (
            existingTransaction?.opsApprovalStatus ===
            OpsApprovalStatusEnum.APPROVED
          ) {
            throw new BadRequestException(
              "Loan payment is already approved. Cannot update status.",
            );
          }
        } else if (transactionType === TransactionTypeEnum.PARTIAL_COLLECTION) {
          const existingTransaction =
            await this.prisma.paymentPartialCollectionTransaction.findUnique({
              where: { id: paymentTransactionId },
              select: { opsApprovalStatus: true },
            });

          if (
            existingTransaction?.opsApprovalStatus ===
            OpsApprovalStatusEnum.APPROVED
          ) {
            throw new BadRequestException(
              "Loan payment is already approved. Cannot update status.",
            );
          }
        }
      }

      // Check payments from the API response (paymentLinkDetails) instead of webhook payload
      const payments = paymentLinkDetails.payments || [];

      // Find the first successful payment
      if (payments && payments.length > 0) {
        const successfulPayment = payments.find(
          (p) => p.status === "captured" || p.status === "authorized",
        );

        if (successfulPayment) {
          // Fetch complete payment details
          const paymentDetails = await this.razorpay.fetchPayment(
            successfulPayment.payment_id, // Use payment_id from the payment link payments array
          );

          // Process as successful payment
          return this.handleRazorpayPaymentCaptured(paymentDetails);
        }
      }

      // If no payments found in payment link details, check via dedicated payments endpoint
      const hasPayment =
        await this.razorpay.hasSuccessfulPayment(paymentLinkId);

      if (hasPayment) {
        // Update transaction status directly since we know payment exists
        return this.updateTransactionStatus(
          paymentTransactionId,
          transactionType,
          TransactionStatusEnum.SUCCESS,
          "Payment completed via payment link",
        );
      } else {
        return { success: false, error: "No successful payment found" };
      }
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to process payment link callback",
      );
    }
  }
  private async handleRazorpayPaymentLinkCancelled(paymentLink: any) {
    try {
      const { id: paymentLinkId, status } = paymentLink;
      const paymentLinkDetails =
        await this.razorpay.fetchPaymentLink(paymentLinkId);
      const notes = paymentLinkDetails.notes;

      if (!notes) {
        throw new NotFoundException("Notes not found in payment link details");
      }

      const paymentTransactionId = notes.payment_transaction_id;
      const transactionType = notes.transaction_type as TransactionTypeEnum;

      if (!paymentTransactionId) {
        throw new NotFoundException(
          "Payment transaction ID not found in notes",
        );
      }

      // Check if loan ops status is already SUCCESS
      if (paymentTransactionId) {
        if (transactionType === TransactionTypeEnum.COLLECTION) {
          const existingTransaction =
            await this.prisma.paymentCollectionTransaction.findUnique({
              where: { id: paymentTransactionId },
              select: { opsApprovalStatus: true },
            });

          if (
            existingTransaction?.opsApprovalStatus ===
            OpsApprovalStatusEnum.APPROVED
          ) {
            throw new BadRequestException(
              "Loan payment is already approved. Cannot update status.",
            );
          }
        } else if (transactionType === TransactionTypeEnum.PARTIAL_COLLECTION) {
          const existingTransaction =
            await this.prisma.paymentPartialCollectionTransaction.findUnique({
              where: { id: paymentTransactionId },
              select: { opsApprovalStatus: true },
            });

          if (
            existingTransaction?.opsApprovalStatus ===
            OpsApprovalStatusEnum.APPROVED
          ) {
            throw new BadRequestException(
              "Loan payment is already approved. Cannot update status.",
            );
          }
        }
      }

      return this.updateTransactionStatus(
        paymentTransactionId,
        transactionType,
        TransactionStatusEnum.FAILED,
        "Payment link was cancelled",
      );
    } catch (error) {
      console.error("💥 Error handling payment link cancelled:", error);
      throw new InternalServerErrorException(
        "Failed to process payment link cancellation",
      );
    }
  }

  private async updateTransactionStatus(
    paymentTransactionId: string,
    transactionType: TransactionTypeEnum,
    status: TransactionStatusEnum,
    reason: string,
  ) {
    const transactionUpdateData: Partial<{
      status: TransactionStatusEnum;
      failureReason: string;
      completedAt: Date;
    }> = {
      status: status,
    };

    if (status === TransactionStatusEnum.SUCCESS) {
      transactionUpdateData.completedAt = new Date();
      transactionUpdateData.failureReason = null;
    } else if (status === TransactionStatusEnum.FAILED) {
      transactionUpdateData.failureReason = reason;
    }

    // Update transaction based on type
    if (transactionType === TransactionTypeEnum.COLLECTION) {
      await this.prisma.paymentCollectionTransaction.update({
        where: { id: paymentTransactionId },
        data: transactionUpdateData,
      });
    } else if (transactionType === TransactionTypeEnum.PARTIAL_COLLECTION) {
      const paymentPartialCollectionTransaction =
        await this.prisma.paymentPartialCollectionTransaction.update({
          where: { id: paymentTransactionId },
          data: transactionUpdateData,
        });
      if (
        paymentPartialCollectionTransaction.isPaymentComplete &&
        paymentPartialCollectionTransaction.paymentRequestId
      ) {
        await this.prisma.paymentRequest.update({
          where: { id: paymentPartialCollectionTransaction.paymentRequestId },
          data: { status: TransactionStatusEnum.SUCCESS },
        });
      }
    }
    return {
      success: true,
      transactionId: paymentTransactionId,
      status: status,
      reason: reason,
    };
  }

  private async handleRazorpayPaymentCaptured(payment: any) {
    const { order_id, id: paymentId, status, amount } = payment;

    try {
      // Fetch order details to get our internal references
      const orderDetails = await this.razorpay.fetchOrder(order_id);
      const notes = orderDetails.notes;

      if (!notes) {
        throw new NotFoundException("Notes not found in order details");
      }

      const requiredFields = [
        "loan_id",
        "payment_request_id",
        "payment_transaction_id",
        "transaction_type",
      ];
      for (const field of requiredFields) {
        if (!notes[field]) {
          throw new NotFoundException(`${field} is missing in order notes.`);
        }
      }

      const loanId = notes.loan_id;
      const paymentRequestId = notes.payment_request_id;
      const paymentTransactionId = notes.payment_transaction_id;
      const transactionType = notes.transaction_type as TransactionTypeEnum;

      // Check if loan ops status is already SUCCESS
      if (paymentTransactionId) {
        if (transactionType === TransactionTypeEnum.COLLECTION) {
          const existingTransaction =
            await this.prisma.paymentCollectionTransaction.findUnique({
              where: { id: paymentTransactionId },
              select: { opsApprovalStatus: true },
            });

          if (
            existingTransaction?.opsApprovalStatus ===
            OpsApprovalStatusEnum.APPROVED
          ) {
            throw new BadRequestException(
              "Loan payment is already approved. Cannot update status.",
            );
          }
        } else if (transactionType === TransactionTypeEnum.PARTIAL_COLLECTION) {
          const existingTransaction =
            await this.prisma.paymentPartialCollectionTransaction.findUnique({
              where: { id: paymentTransactionId },
              select: { opsApprovalStatus: true },
            });

          if (
            existingTransaction?.opsApprovalStatus ===
            OpsApprovalStatusEnum.APPROVED
          ) {
            throw new BadRequestException(
              "Loan payment is already approved. Cannot update status.",
            );
          }
        }
      }

      // Determine the correct relation field based on transactionType
      const transactionRelation =
        transactionType === TransactionTypeEnum.COLLECTION
          ? "collectionTransactions"
          : transactionType === TransactionTypeEnum.PARTIAL_COLLECTION
            ? "partialCollectionTransactions"
            : null;

      if (!transactionRelation) {
        throw new BadRequestException(
          `Unsupported transaction type: ${transactionType}`,
        );
      }

      const paymentRequest = await this.prisma.paymentRequest.findFirst({
        where: {
          id: paymentRequestId,
          loanId,
          type: transactionType,
        },
        include: {
          [transactionRelation]: {
            where: { id: paymentTransactionId },
          },
        },
      });

      const transactions = paymentRequest?.[transactionRelation];

      if (!paymentRequest || transactions?.length === 0) {
        throw new NotFoundException(
          `No payment transaction found for loan ${loanId} with order ${order_id}`,
        );
      }

      // Update transaction status
      const transactionUpdateData: Partial<{
        status: TransactionStatusEnum;
        failureReason: string;
        completedAt: Date;
      }> = {
        status: TransactionStatusEnum.SUCCESS,
        completedAt: new Date(),
        failureReason: null,
      };

      if (transactionType === TransactionTypeEnum.COLLECTION) {
        await this.prisma.paymentCollectionTransaction.update({
          where: { id: paymentTransactionId },
          data: transactionUpdateData,
        });
      } else if (transactionType === TransactionTypeEnum.PARTIAL_COLLECTION) {
        const paymentPartialCollectionTransaction =
          await this.prisma.paymentPartialCollectionTransaction.update({
            where: { id: paymentTransactionId },
            data: transactionUpdateData,
          });
        if (
          paymentPartialCollectionTransaction.isPaymentComplete &&
          paymentPartialCollectionTransaction.paymentRequestId
        ) {
          await this.prisma.paymentRequest.update({
            where: { id: paymentPartialCollectionTransaction.paymentRequestId },
            data: { status: TransactionStatusEnum.SUCCESS },
          });
        }
      }
      return {
        success: true,
        paymentId,
        orderId: order_id,
        loanId,
        transactionType,
      };
    } catch (error) {
      console.error("Error handling Razorpay payment captured:", error);
      throw new InternalServerErrorException(
        "Failed to process Razorpay payment callback",
      );
    }
  }

  private async handleRazorpayPaymentFailed(payment: any) {
    const { order_id, id: paymentId, error_description } = payment;

    try {
      // Fetch order details to get our internal references
      const orderDetails = await this.razorpay.fetchOrder(order_id);
      const notes = orderDetails.notes;

      if (!notes) {
        throw new NotFoundException("Notes not found in order details");
      }

      const paymentTransactionId = notes.payment_transaction_id;
      const transactionType = notes.transaction_type as TransactionTypeEnum;
      const paymentRequestId = notes.payment_request_id;

      if (!paymentTransactionId || !paymentRequestId) {
        throw new NotFoundException(
          "Payment transaction ID or Payment Request ID not found in notes",
        );
      }

      // First, check the payment request status
      const paymentRequest = await this.prisma.paymentRequest.findUnique({
        where: { id: paymentRequestId },
        select: { status: true },
      });

      if (!paymentRequest) {
        throw new NotFoundException("Payment request not found");
      }

      // If payment request is already SUCCESS, skip webhook processing
      if (paymentRequest.status === TransactionStatusEnum.SUCCESS) {
        return {
          success: true,
          message: "Payment request is already SUCCESS, webhook ignored",
          paymentId,
          orderId: order_id,
          status: "ignored",
        };
      }

      // Then, check the specific transaction status based on type
      if (transactionType === TransactionTypeEnum.COLLECTION) {
        const existingTransaction =
          await this.prisma.paymentCollectionTransaction.findUnique({
            where: { id: paymentTransactionId },
            select: { status: true, opsApprovalStatus: true },
          });

        if (!existingTransaction) {
          throw new NotFoundException(
            "Payment collection transaction not found",
          );
        }

        // If transaction is already SUCCESS, skip webhook processing
        if (existingTransaction.status === TransactionStatusEnum.SUCCESS) {
          return {
            success: true,
            message: "Transaction is already SUCCESS, webhook ignored",
            paymentId,
            orderId: order_id,
            status: "ignored",
          };
        }

        // Also check opsApprovalStatus if needed
        if (
          existingTransaction.opsApprovalStatus ===
          OpsApprovalStatusEnum.APPROVED
        ) {
          throw new BadRequestException(
            "Loan payment is already approved. Cannot update status.",
          );
        }
      } else if (transactionType === TransactionTypeEnum.PARTIAL_COLLECTION) {
        const existingTransaction =
          await this.prisma.paymentPartialCollectionTransaction.findUnique({
            where: { id: paymentTransactionId },
            select: { status: true, opsApprovalStatus: true },
          });

        if (!existingTransaction) {
          throw new NotFoundException(
            "Payment partial collection transaction not found",
          );
        }

        // If transaction is already SUCCESS, skip webhook processing
        if (existingTransaction.status === TransactionStatusEnum.SUCCESS) {
          return {
            success: true,
            message: "Transaction is already SUCCESS, webhook ignored",
            paymentId,
            orderId: order_id,
            status: "ignored",
          };
        }

        // Also check opsApprovalStatus if needed
        if (
          existingTransaction.opsApprovalStatus ===
          OpsApprovalStatusEnum.APPROVED
        ) {
          throw new BadRequestException(
            "Loan payment is already approved. Cannot update status.",
          );
        }
      } else {
        throw new BadRequestException(
          `Unsupported transaction type: ${transactionType}`,
        );
      }

      // If we reach here, the transaction is not SUCCESS, so we can process the failure
      const transactionUpdateData: Partial<{
        status: TransactionStatusEnum;
        failureReason: string;
      }> = {
        status: TransactionStatusEnum.FAILED,
        failureReason: error_description || "Payment failed in Razorpay",
      };

      if (transactionType === TransactionTypeEnum.COLLECTION) {
        await this.prisma.paymentCollectionTransaction.update({
          where: { id: paymentTransactionId },
          data: transactionUpdateData,
        });
      } else if (transactionType === TransactionTypeEnum.PARTIAL_COLLECTION) {
        await this.prisma.paymentPartialCollectionTransaction.update({
          where: { id: paymentTransactionId },
          data: transactionUpdateData,
        });
      }

      // Also update the payment request status to FAILED
      await this.prisma.paymentRequest.update({
        where: { id: paymentRequestId },
        data: { status: TransactionStatusEnum.FAILED },
      });

      return {
        success: true,
        paymentId,
        orderId: order_id,
        status: "failed",
      };
    } catch (error) {
      console.error("Error handling Razorpay payment failed:", error);

      // If it's a BadRequestException or NotFoundException, rethrow it
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Failed to process Razorpay payment failure callback",
      );
    }
  }

  async createDisburseLoanRequest(loanId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        user: true,
        disbursement: true,
        agreement: true,
      },
    });

    if (!loan) {
      throw new NotFoundException("Loan not found for the provided loan ID.");
    }

    if (loan.status === loan_status_enum.DISBURSED) {
      throw new BadRequestException("Loan is already disbursed.");
    }

    if (
      !(
        [
          loan_status_enum.APPROVED,
          loan_status_enum.SANCTION_MANAGER_APPROVED,
        ] as loan_status_enum[]
      ).includes(loan.status)
    ) {
      throw new BadRequestException(
        `Loan must be approved before disbursement . Current status: ${loan.status}`,
      );
    }

    if (
      !loan.agreement ||
      loan.agreement.status !== agreement_status_enum.SIGNED
    ) {
      throw new BadRequestException(
        "Loan agreement must be approved before disbursement.",
      );
    }

    if (!loan.disbursement) {
      throw new NotFoundException(
        "No disbursement details found for this loan.",
      );
    }
    const paymentRequest = await this.prisma.paymentRequest.upsert({
      where: {
        loanId_type: {
          loanId,
          type: TransactionTypeEnum.DISBURSEMENT,
        },
      },
      create: {
        loanId,
        brandId: loan.brandId,
        userId: loan.userId,
        type: TransactionTypeEnum.DISBURSEMENT,
        status: TransactionStatusEnum.PENDING,
      },
      update: {
        status: TransactionStatusEnum.PENDING,
      },
    });
    return paymentRequest;
  }

  async handleDisbursementTransaction(
    partnerUserId: string,
    paymentRequestId: string,
    loanId: string,
    method: PaymentMethodEnum = PaymentMethodEnum.MANUAL,
    externalRef: string | null = null,
    disbursementDate: string | null = null,
    brandBankAccountId: string,
    confirmPassword: string | null = null,
    partnerUser: PartnerUser,
    transferType?: TransferTypeEnum,
    provider: "IDFC" | "ICICI" = null,
  ) {
    // Validate password for IDFC disbursements (mandatory)
    if (
      method === PaymentMethodEnum.IDFC ||
      provider === "IDFC" ||
      method === PaymentMethodEnum.ICICI ||
      provider === "ICICI"
    ) {
      if (!transferType) {
        throw new BadRequestException(
          "Transfer type is required for IDFC disbursements",
        );
      }
      if (!confirmPassword || confirmPassword.trim().length === 0) {
        throw new BadRequestException(
          "Password is required for IDFC disbursements",
        );
      }
      if (confirmPassword.trim().length < 4) {
        throw new BadRequestException("Password must be at least 4 characters");
      }
      try {
        const isValidPartnerCode =
          await this.partnerUserSecureCodeService.validatePartnerUserCode(
            partnerUserId,
            confirmPassword.trim(),
            partnerUserId,
          );

        if (!isValidPartnerCode) {
          throw new BadRequestException(
            "Invalid partner secure code. Authorization failed.",
          );
        }
      } catch (error) {
        this.logger.error(`Partner code validation failed: ${error.message}`);
        throw new BadRequestException(
          "Partner secure code validation failed. Please try again.",
        );
      }
    }

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        disbursement: true,
        user: {
          include: {
            userDetails: true,
            user_bank_account: {
              where: {
                isPrimary: true,
                // isVerified: true,
                verificationStatus: "VERIFIED",
              },
            },
          },
        },
        loanDetails: {
          select: {
            dueDate: true,
          },
        },
        allottedPartners: {
          include: {
            partnerUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        paymentRequests: {
          where: {
            type: TransactionTypeEnum.DISBURSEMENT,
          },
          include: {
            disbursalTransactions: {
              where: {
                status: TransactionStatusEnum.SUCCESS,
              },
            },
          },
        },
      },
    });

    if (!loan.paymentRequests || loan.paymentRequests.length === 0) {
      throw new NotFoundException(
        "No payment request found for disbursement for this loan.",
      );
    }
    if (
      loan.paymentRequests[0].disbursalTransactions.length > 0 ||
      loan.paymentRequests[0].status === TransactionStatusEnum.SUCCESS
    ) {
      throw new BadRequestException(
        "Disbursement transaction already exists for this loan.",
      );
    }
    const [paymentRequest, brandBankAccount, existingTransaction] =
      await Promise.all([
        this.prisma.paymentRequest.findUnique({
          where: { id: paymentRequestId },
        }),
        brandBankAccountId
          ? this.prisma.brandBankAccount.findUnique({
              where: { id: brandBankAccountId },
            })
          : null,
        method === PaymentMethodEnum.MANUAL && externalRef
          ? this.prisma.paymentDisbursalTransaction.findFirst({
              where: {
                externalRef,
                paymentRequest: {
                  brandId: loan.brandId,
                  type: TransactionTypeEnum.DISBURSEMENT,
                },
              },
              select: {
                paymentRequest: {
                  select: {
                    loan: {
                      select: { formattedLoanId: true },
                    },
                  },
                },
              },
            })
          : null,
      ]);

    if (existingTransaction) {
      throw new BadRequestException(
        `Disbursement transaction already exists with the same external reference. Loan ID: ${existingTransaction?.paymentRequest?.loan?.formattedLoanId}`,
      );
    }

    if (method === PaymentMethodEnum.ICICI || provider === "ICICI") {
      const paymentDisbursalTransaction =
        await this.prisma.paymentDisbursalTransaction.count({
          where: {
            pdt_loan_id: loanId,
            updatedAt: { gte: _dayjs().subtract(30, "minutes").toDate() },
          },
        });
      if (paymentDisbursalTransaction > 0) {
        throw new BadRequestException(
          `There is already a recent IDFC disbursement transaction for this loan. Please wait for it to complete before initiating a new one.`,
        );
      }
    }

    if (!loan) throw new NotFoundException("Loan not found.");
    if (!loan.user) throw new NotFoundException("User not found for the loan.");
    if (!paymentRequest)
      throw new NotFoundException("Payment request not found.");
    if (!brandBankAccount && method === PaymentMethodEnum.MANUAL)
      throw new NotFoundException("Brand bank account not found.");
    if (paymentRequest.type !== TransactionTypeEnum.DISBURSEMENT)
      throw new BadRequestException("Payment request is not for disbursement.");
    if (paymentRequest.status !== TransactionStatusEnum.PENDING)
      throw new BadRequestException(
        "Payment request is not in pending status.",
      );
    if (
      !loan.user.user_bank_account ||
      loan.user.user_bank_account.length === 0
    ) {
      throw new BadRequestException(
        "User bank account not found for disbursement.",
      );
    }
    const userBankAccount = loan.user.user_bank_account[0];
    const user = loan.user;
    const amount = loan.disbursement?.netAmount || 0;
    let bankAccountNumber = null;
    let bankName = null;
    let ifscCode = null;
    if (brandBankAccount) {
      bankAccountNumber = brandBankAccount?.accountNumber;
      bankName = brandBankAccount?.bankName;
      ifscCode = brandBankAccount?.ifscCode;
    }
    const { userDetails } = loan.user;
    const fullName = [
      userDetails.firstName,
      userDetails.middleName,
      userDetails.lastName,
    ]
      .filter(Boolean) // removes null, undefined, empty string
      .join(" ");

    const now = new Date();

    let status: TransactionStatusEnum = TransactionStatusEnum.PENDING;
    let externalUrl: string | null = null;
    if (method === PaymentMethodEnum.MANUAL) {
      status = TransactionStatusEnum.SUCCESS;
    }
    // uuid()
    const paymentDisbursalTransactionId = uuid();
    let responseJSON: any = {};

    try {
      const now = new Date();

      await this.prisma.$transaction(async (tx) => {
        const receiptId = generateReceiptId();
        const finalDisbursementDate = disbursementDate
          ? new Date(disbursementDate)
          : now;

        await tx.paymentDisbursalTransaction.create({
          data: {
            id: paymentDisbursalTransactionId,
            paymentRequestId: paymentRequest.id,
            status,
            amount: loan.disbursement?.netAmount ?? 0,
            currency: "INR",
            method,
            receiptId,

            externalRef: externalRef ?? null,
            externalUrl: externalUrl ?? null,

            retryCount: 0,
            failureReason: null,

            note: `Disbursement for loan ${loan.formattedLoanId} to user ${fullName} DT${_dayjs().format(
              "YYYYMMDDHHmmss",
            )}----${paymentDisbursalTransactionId}`,

            accountHolderName: fullName,
            bankAccountNumber,
            bankName,
            ifscCode,

            completedAt: now,
            createdAt: now,
            updatedAt: now,

            createdByPartnerId: partnerUserId,
            opsPartnerId: partnerUserId,
            pdt_loan_id: loan.id,

            transferMode: transferType || null,
            responseJSON,
          },
        });

        await tx.paymentRequest.update({
          where: { id: paymentRequest.id },
          data: { status },
        });

        // ✅ Now safely part of the same transaction
        if (method === "MANUAL" && status === TransactionStatusEnum.SUCCESS) {
          await tx.loan.update({
            where: { id: loanId },
            data: {
              status: loan_status_enum.ACTIVE,
              disbursementDate: finalDisbursementDate,
            },
          });
        }
      });
    } catch (error) {
      this.logger.error(
        {
          paymentRequestId: paymentRequest?.id,
          paymentDisbursalTransactionId,
          error,
        },
        "Failed to create disbursement transaction",
      );

      throw new InternalServerErrorException(
        error?.message ||
          "Failed to create disbursement transaction record. Please try again.",
      );
    }
    if (method === PaymentMethodEnum.IDFC) {
      try {
        const transferRequest: FundTransferRequest = {
          amount: amount.toFixed(2),
          beneficiaryAccount: userBankAccount.accountNumber,
          beneficiaryName: userBankAccount.accountHolderName,
          beneficiaryIFSC: userBankAccount.ifscCode?.toLocaleUpperCase(),
          remarks: `idfc disbursement for loan ${loan.formattedLoanId} DT${_dayjs().format("YYYYMMDDHHmmss")}----${paymentDisbursalTransactionId}`,
          // Add new required fields for IDFC
          beneficiaryAddress:
            typeof userBankAccount?.bankAddress === "string"
              ? userBankAccount.bankAddress.slice(0, 34)
              : "N/A",
          emailId: user?.email,
          mobileNo: user.phoneNumber,
          partnerUserId: partnerUserId,
        };
        const idfcResponse = await this.idfcProvider.initiateTransfer(
          transferRequest,
          paymentDisbursalTransactionId.split("-")[0],
          transferType,
        );
        if (
          idfcResponse.status === "SUCCESS" ||
          (idfcResponse.data?.metaData?.status === "ERROR" &&
            idfcResponse.data?.metaData?.code === "NPCI: ZI")
        ) {
          status = TransactionStatusEnum.SUCCESS;
          externalRef = idfcResponse?.referenceNumber || null;
          responseJSON = idfcResponse;
          bankAccountNumber = process.env.IDFC_DEBIT_ACCOUNT;
          bankName = "IDFC FIRST Bank";
          ifscCode = process.env.IDFC_IFSC_CODE;
        } else {
          status = TransactionStatusEnum.FAILED;
          responseJSON = idfcResponse;
          externalUrl = null;
        }
      } catch (error) {
        status = TransactionStatusEnum.FAILED;
        console.error("Error during IDFC fund transfer:", error);
      }
      await this.prisma.paymentDisbursalTransaction.update({
        where: { id: paymentDisbursalTransactionId },
        data: {
          status,
          externalRef,
          externalUrl,
          responseJSON,
          updatedAt: new Date(),
          paymentRequest: {
            update: {
              status: status,
              description: ` Disbursement ${status === TransactionStatusEnum.SUCCESS ? "successful" : "failed"} for loan ${loan.formattedLoanId}`,
            },
          },
        },
      });
      if (status === TransactionStatusEnum.SUCCESS) {
        await this.prisma.loan.update({
          where: { id: loanId },
          data: {
            status: loan_status_enum.ACTIVE,
            disbursementDate: disbursementDate
              ? new Date(disbursementDate)
              : now,
          },
        });
      }
    }

    if (method === PaymentMethodEnum.ICICI) {
      try {
        const transferRequest = {
          // Amount
          amount: amount.toFixed(2), // Remarks / narration
          remarks: `ICICI disbursement for loan ${
            loan.formattedLoanId
          } DT${_dayjs().format("YYYYMMDDHHmmss")}----${paymentDisbursalTransactionId}`,
          tranRefNo: paymentDisbursalTransactionId,
          priority: ICICIPriorityEnum.IMPS_NEFT_FALLBACK,
          formattedLoanId: loan.formattedLoanId,
          // Beneficiary details (from DB)
          beneAccNo: userBankAccount.accountNumber,
          beneIFSC: userBankAccount.ifscCode.toUpperCase(),
          beneName: userBankAccount.accountHolderName,
          // Sender / device info
          mobile: user.phoneNumber,
        };

        // 🔁 Initiate ICICI transfer with IMPS → NEFT fallback
        const iciciResponse =
          await this.iciciProvider.initiateTransferWithFallback(
            transferRequest,
            paymentDisbursalTransactionId,
          );
        responseJSON = iciciResponse;
        if (
          iciciResponse.success &&
          (iciciResponse.data?.ActCode === "0" ||
            iciciResponse.data?.ActCode === "1" ||
            iciciResponse.data?.ActCode === "68" ||
            iciciResponse.data?.ActCode === "92" ||
            iciciResponse.data?.ActCode === "95" ||
            iciciResponse.data?.ActCode === "96" ||
            iciciResponse.data?.ActCode === "97")
        ) {
          // ICICI is async → mark PENDING, resolve via status job later
          status = TransactionStatusEnum.SUCCESS;
          externalRef = iciciResponse.referenceNumber ?? null;
          bankName = "ICICI Bank";
          bankAccountNumber = process.env.ICICI_DEBIT_ACCOUNT_NO ?? null;
          ifscCode = null; // debit IFSC not required to store
        } else {
          status = TransactionStatusEnum.FAILED;
        }
      } catch (error) {
        status = TransactionStatusEnum.FAILED;
        this.logger.error(
          {
            paymentDisbursalTransactionId,
            error,
          },
          "Error during ICICI fund transfer",
        );
      }
      await this.prisma.paymentDisbursalTransaction.update({
        where: { id: paymentDisbursalTransactionId },
        data: {
          status,
          externalRef,
          externalUrl,
          responseJSON,
          updatedAt: new Date(),
          paymentRequest: {
            update: {
              status: status,
              description: ` Disbursement ${status === TransactionStatusEnum.SUCCESS ? "successful" : "failed"} for loan ${loan.formattedLoanId}`,
            },
          },
        },
      });
      if (status === TransactionStatusEnum.SUCCESS) {
        await this.prisma.loan.update({
          where: { id: loanId },
          data: {
            status: loan_status_enum.ACTIVE,
            disbursementDate: disbursementDate
              ? new Date(disbursementDate)
              : now,
          },
        });
      }
    }

    if (status !== TransactionStatusEnum.SUCCESS) {
      throw new InternalServerErrorException(
        responseJSON?.message ||
          "Disbursement failed. Cannot update loan status.",
      );
    }

    try {
      const previousStatus = loan.status;
      const newStatus = loan_status_enum.ACTIVE;

      const isHighPriority = [
        loan_status_enum.REJECTED,
        loan_status_enum.APPROVED,
        loan_status_enum.DISBURSED,
      ].includes(previousStatus as any);

      const notificationTargets =
        loan.allottedPartners?.map((ap) => ({
          partnerUserId: ap.partnerUserId,
          platform: platform_type.PARTNER,
        })) ?? [];

      await Promise.all([
        // 1️⃣ Loan status history
        this.prisma.loanStatusHistory.create({
          data: {
            loanId: loan.id,
            status: newStatus,
            partnerUserId,
            message: "Loan disbursed and moved to ACTIVE status.",
          },
        }),

        // 2️⃣ User audit log
        this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
          userId: loan.userId,
          partnerUserId,
          type: "LoanApplication",
          brandId: loan.brandId,
          message: `Loan status updated from ${previousStatus} to ${newStatus} after disbursement.`,

          platformType: platform_type.PARTNER,
          context: {
            action: "LOAN_STATUS_UPDATE",
            loanId: loan.id,
            formattedLoanId: loan.formattedLoanId,
            previousStatus,
            newStatus,
            reason: "Disbursement completed",
            approvedLoanAmount: loan.amount ?? null,
            disbursementDate: now,
            dueDate: loan.loanDetails?.dueDate ?? null,
            partnerUserName: partnerUser?.name ?? null,
            partnerUserEmail: partnerUser?.email ?? null,
          },
        }),

        // 3️⃣ Notification
        this.notificationService.create({
          title: `Loan Disbursed: ${loan.formattedLoanId}`,
          message: `The loan ${loan.formattedLoanId} has been disbursed and is now ACTIVE.`,
          priority: isHighPriority
            ? notification_priority_enum.HIGH
            : notification_priority_enum.LOW,
          loanId: loan.id,
          userId: userDetails?.userId ?? null,
          targets: notificationTargets,
        }),
      ]);
    } catch (error) {
      this.logger.error(
        {
          loanId: loan.id,
          error,
        },
        "NOTIFICATION ERROR: Failed to process post-disbursement events",
      );
    }
  }

  async createManualCollectionPayment(
    partnerUserId: string,
    loanId: string,
    loanStatus: loan_status_enum = loan_status_enum.PAID,
    method: PaymentMethodEnum = PaymentMethodEnum.MANUAL,
    disburseDate: string,
    externalRef: string,
    paymentNote: string,
    jsonAmount: string,
    isReloanApplicable: boolean,
    reloanRemark: string | null = null,
    isPaymentComplete: boolean,
    excessAmount: string,
    brandBankAccountId: string,
    files?: Express.Multer.File[],
  ) {
    let generatePaymentLink = method !== PaymentMethodEnum.MANUAL;
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        user: {
          include: {
            userDetails: true,
            brandSubDomain: true,
          },
        },
        brand: {
          include: { brand_sub_domains: true },
        },
        loanDetails: true,
      },
    });
    if (!loan) throw new NotFoundException("Loan not found.");

    const pan = await this.prisma.document.findFirst({
      where: {
        userId: loan.userId,
        type: DocumentTypeEnum.PAN,
        //status: document_status_enum.APPROVED,
      },
      select: { id: true, documentNumber: true },
    });

    if (!pan)
      throw new BadRequestException(
        "Approved PAN document not found for the user.",
      );

    const state = loan?.user?.userDetails?.state;
    // const validateRepaymentDate =
    //   await this.repaymentValidationService.validateRepaymentDate(
    //     loan?.brandId,
    //     new Date(disburseDate),
    //     state || undefined
    //   );
    // if (!validateRepaymentDate.isAllowed) {
    //   throw new BadRequestException(
    //     `Repayments are not allowed today. Reason: ${validateRepaymentDate.reason}`
    //   );
    // }

    if (!partnerUserId)
      throw new BadRequestException("Partner user ID is required.");

    const existingExternalRef =
      await this.prisma.paymentCollectionTransaction.findFirst({
        where: {
          externalRef,
          status: TransactionStatusEnum.SUCCESS,
          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
        },
      });

    if (existingExternalRef) {
      throw new BadRequestException(
        "Payment transaction already exists with status SUCCESS and same external reference.",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: loan.userId },
      include: { userDetails: true },
    });
    if (!user) throw new NotFoundException("User not found.");

    if (
      loan.disbursementDate &&
      loan.loanDetails?.minActiveRepaymentDays &&
      _dayjs(disburseDate)
        .startOf("day")
        .isBefore(
          _dayjs(loan.disbursementDate)
            .add(loan.loanDetails.minActiveRepaymentDays, "day")
            .startOf("day"),
        )
    ) {
      const disbDate = _dayjs(loan.disbursementDate).format("YYYY-MM-DD");
      const earliestPaymentDate = _dayjs(loan.disbursementDate)
        .add(loan.loanDetails.minActiveRepaymentDays, "day")
        .format("YYYY-MM-DD");

      throw new BadRequestException(
        `Loan cannot be paid before ${loan.loanDetails.minActiveRepaymentDays} days from the disbursement date.\n` +
          `Disbursement Date: ${disbDate}\nEarliest Allowed Payment Date: ${earliestPaymentDate}`,
      );
    }

    const payment = await this.prisma.paymentRequest.upsert({
      where: { loanId_type: { loanId, type: TransactionTypeEnum.COLLECTION } },
      create: {
        loanId,
        brandId: loan.brandId,
        userId: user.id,
        type: TransactionTypeEnum.COLLECTION,
        status: TransactionStatusEnum.PENDING,
      },
      update: { status: TransactionStatusEnum.PENDING },
    });

    const existingTransaction =
      await this.prisma.paymentCollectionTransaction.findFirst({
        where: {
          paymentRequestId: payment.id,
          status: TransactionStatusEnum.SUCCESS,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });

    if (existingTransaction) {
      const { opsApprovalStatus } = existingTransaction;
      if (opsApprovalStatus === OpsApprovalStatusEnum.APPROVED) {
        throw new BadRequestException(
          "A successful and approved payment transaction already exists for this request.",
        );
      }
      if (opsApprovalStatus === OpsApprovalStatusEnum.PENDING) {
        throw new BadRequestException(
          "A payment transaction is already pending approval for this request.",
        );
      }
    }

    // Upload files
    let uploadedFiles: { key: string }[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const uploaded = await this.awsS3Service.uploadPrivateDocument(
          file,
          user.brandId,
          user.id,
          "payslip",
        );
        if (!uploaded?.key)
          throw new InternalServerErrorException(
            "Failed to upload file to S3.",
          );
        uploadedFiles.push(uploaded);
      }
    }

    const amount = JSON.parse(jsonAmount);

    let paymentTransaction =
      await this.prisma.paymentCollectionTransaction.create({
        data: {
          id: uuid(),
          paymentRequestId: payment.id,
          status: generatePaymentLink
            ? TransactionStatusEnum.PENDING
            : TransactionStatusEnum.SUCCESS,
          currency: "INR",
          retryCount: 0,
          receiptId: generateReceiptId(),
          note: paymentNote || "Manual payment received",
          method,
          completedAt: disburseDate ? new Date(disburseDate) : new Date(),
          externalRef,
          platformType: platform_type.PARTNER,
          externalUrl: null,
          failureReason: null,
          updatedAt: new Date(),
          paymentDetails: JSON.stringify({
            ...amount,
            amount: Number(amount.amount) + Number(excessAmount),
            excessAmount,
          }),
          totalFees: +amount.interest,
          totalTaxes: 0,
          principalAmount: +amount.principal,
          amount: Number(amount.total) + Number(excessAmount),
          penaltyDiscount: Number(amount.penalty_discount || 0),
          roundOffDiscount: Number(amount.interest_discount || 0),
          totalPenalties: +amount.penalty,
          isReloanApplicable,
          reloanRemark,
          isPaymentComplete,
          excessAmount: +excessAmount,
          createdByPartnerId: partnerUserId,
          brand_bank_id: brandBankAccountId || null,
          pct_loan_id: loan.id,
        },
      });

    if (uploadedFiles.length > 0) {
      await this.prisma.paymentTransactionReceipt.createMany({
        data: uploadedFiles.map((f) => ({
          transactionId: paymentTransaction.id,
          receiptKey: f.key,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      });
    }

    const fullName = [
      loan.user.userDetails.firstName,
      loan.user.userDetails.middleName,
      loan.user.userDetails.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    let createOrder = null;
    if (generatePaymentLink) {
      createOrder = await this.createPaymentOrder({
        paymentRequestId: payment.id,
        paymentTransactionId: paymentTransaction.id,
        amount: Number(paymentTransaction.amount),
        fullName: fullName,
        phoneNumber: loan.user.phoneNumber,
        panNumber: pan.documentNumber,
        loanId: loan.id,
        receiptId: paymentTransaction.receiptId,
        platformType: platform_type.PARTNER,
        transactionType: TransactionTypeEnum.COLLECTION,
        method: method,
        formattedUserId: user.formattedUserId,
        formattedLoanId: loan.formattedLoanId,
        web_hostname: `${loan.user.brandSubDomain?.subdomain || loan.brand?.brand_sub_domains?.[0]?.subdomain}`,
        userId: user.id,
      });

      // Handle different response formats for different payment methods
      let isValidResponse = false;
      let paymentLink = null;
      let externalRefValue = null;
      let externalUrlValue = null;

      if (method === PaymentMethodEnum.PAYTERNING) {
        isValidResponse = !!(createOrder?.order_id && createOrder?.status);
        if (isValidResponse) {
          externalRefValue = createOrder.order_id;
          externalUrlValue = createOrder.url;
          paymentLink = Buffer.from(createOrder.url, "base64").toString(
            "utf-8",
          );
        }
      } else if (method === PaymentMethodEnum.RAZORPAY) {
        isValidResponse = !!(createOrder?.payment_link_id && createOrder?.url);
        if (isValidResponse) {
          externalRefValue = createOrder.payment_link_id;
          externalUrlValue = createOrder.url;
          paymentLink = createOrder.url;
        }
      } else if (method === PaymentMethodEnum.CASHFREE) {
        isValidResponse = !!(createOrder?.payment_link_id && createOrder?.url);
        if (isValidResponse) {
          externalRefValue = createOrder.payment_link_id;
          externalUrlValue = createOrder.url;
          paymentLink = createOrder.url;
        }
      }

      if (!isValidResponse) {
        await this.prisma.paymentCollectionTransaction.update({
          where: { id: paymentTransaction.id },
          data: {
            status: TransactionStatusEnum.FAILED,
            failureReason: `Failed to create payment order with ${method}. Response: ${JSON.stringify(createOrder)}`,
          },
        });

        throw new InternalServerErrorException(
          `Failed to create payment order with ${method}.`,
        );
      }

      // Update transaction with payment gateway data
      paymentTransaction =
        await this.prisma.paymentCollectionTransaction.update({
          where: { id: paymentTransaction.id },
          data: {
            externalRef: externalRefValue,
            externalUrl: externalUrlValue,
            paymentLink: paymentLink,
          },
        });
    }

    try {
      await this.sendPaymentCreatedNotification(
        paymentTransaction.id,
        loan,
        user,
        "Collection",
        partnerUserId,
      );
    } catch (notificationError) {
      console.error(
        `❌ Failed to send payment creation notification: ${notificationError.message}`,
        notificationError.stack,
      );
    }

    return paymentTransaction;
  }

  async createPartialCollectionPayment(
    partnerUserId: string,
    loanId: string,
    loanStatus: loan_status_enum = loan_status_enum.PARTIALLY_PAID,
    method: PaymentMethodEnum = PaymentMethodEnum.MANUAL,
    disburseDate: string,
    externalRef: string,
    paymentNote: string,
    jsonAmount: string,
    paymentRequestStatus: TransactionStatusEnum = TransactionStatusEnum.SUCCESS,
    isReloanApplicable: boolean,
    reloanRemark: string | null = null,
    isPaymentComplete: boolean,
    excessAmount: string,
    brandBankAccountId?: string,
    files?: Express.Multer.File[],
  ) {
    // Generate payment links for Paytring, Razorpay, and Cashfree
    let generatePaymentLink = false;
    if (
      method === PaymentMethodEnum.PAYTERNING ||
      method === PaymentMethodEnum.RAZORPAY ||
      method === PaymentMethodEnum.CASHFREE
    ) {
      generatePaymentLink = true;
    }

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        user: {
          include: {
            userDetails: true,
            brandSubDomain: true,
          },
        },
        brand: {
          include: { brand_sub_domains: true },
        },
        loanDetails: true,
      },
    });

    if (!loan) throw new NotFoundException("Loan not found.");

    const pan = await this.prisma.document.findFirst({
      where: {
        userId: loan.userId,
        type: DocumentTypeEnum.PAN,
        //status: document_status_enum.APPROVED,
      },
      select: {
        id: true,
        documentNumber: true,
      },
    });

    if (!pan) {
      throw new BadRequestException(
        "Approved PAN document not found for the user.",
      );
    }
    if (!partnerUserId) {
      throw new BadRequestException("Partner user ID is required.");
    }
    if (externalRef && externalRef?.length > 2) {
      const existingExternalRef =
        await this.prisma.paymentPartialCollectionTransaction.findFirst({
          where: {
            externalRef,
            status: TransactionStatusEnum.SUCCESS,
            opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
          },
        });
      if (existingExternalRef) {
        throw new BadRequestException(
          "Payment transaction already exists with status SUCCESS and same external reference.",
        );
      }
    }

    if (
      loan.disbursementDate &&
      loan.loanDetails?.minActiveRepaymentDays &&
      _dayjs(disburseDate)
        .startOf("day")
        .isBefore(
          _dayjs(loan.disbursementDate)
            .add(loan.loanDetails.minActiveRepaymentDays, "day")
            .startOf("day"),
        )
    ) {
      const disbursementDate = _dayjs(loan.disbursementDate).format(
        "YYYY-MM-DD",
      );
      const earliestPaymentDate = _dayjs(loan.disbursementDate)
        .add(loan.loanDetails.minActiveRepaymentDays, "day")
        .format("YYYY-MM-DD");
      throw new BadRequestException(
        `Loan cannot be paid before ${loan.loanDetails.minActiveRepaymentDays} days from the disbursement date.\n` +
          `Disbursement Date: ${disbursementDate}\n` +
          `Earliest Allowed Payment Date: ${earliestPaymentDate}`,
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: loan.userId },
      include: { userDetails: true },
    });

    if (!user) throw new NotFoundException("User not found.");

    const payment = await this.prisma.paymentRequest.upsert({
      where: {
        loanId_type: {
          loanId,
          type: TransactionTypeEnum.PARTIAL_COLLECTION,
        },
      },
      create: {
        loanId,
        brandId: loan.brandId,
        userId: user.id,
        type: TransactionTypeEnum.PARTIAL_COLLECTION,
        status: TransactionStatusEnum.PENDING,
      },
      update: {
        status: TransactionStatusEnum.PENDING,
      },
    });

    if (!payment?.id) {
      throw new InternalServerErrorException(
        "Failed to create payment request.",
      );
    }

    // 🔍 Check if there's already a pending ops approval transaction
    const existingPendingTxn =
      await this.prisma.paymentPartialCollectionTransaction.findFirst({
        where: {
          paymentRequestId: payment.id,
          status: TransactionStatusEnum.SUCCESS,
          opsApprovalStatus: OpsApprovalStatusEnum.PENDING,
        },
        select: { id: true },
      });

    if (existingPendingTxn) {
      throw new BadRequestException(
        "A pending payment request already exists for this loan. Please approve or reject it before creating a new one.",
      );
    }

    // 🔁 Handle multiple files
    let uploadedFiles: { key: string }[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const uploaded = await this.awsS3Service.uploadPrivateDocument(
          file,
          user.brandId,
          user.id,
          "payslip",
        );
        if (!uploaded?.key) {
          throw new InternalServerErrorException(
            "Failed to upload file to S3.",
          );
        }
        uploadedFiles.push(uploaded);
      }
    }

    const amount = JSON.parse(jsonAmount);

    const partialCollection = await this.loansService.partialCollection(
      user.id,
      loanId,
      amount.total,
      _dayjs(disburseDate),
      isPaymentComplete,
    );

    let paymentTransaction =
      await this.prisma.paymentPartialCollectionTransaction.create({
        data: {
          id: uuid(),
          paymentRequestId: payment.id,
          status: generatePaymentLink
            ? TransactionStatusEnum.PENDING
            : TransactionStatusEnum.SUCCESS,
          currency: "INR",
          retryCount: 0,
          receiptId: generateReceiptId(),
          note: paymentNote || "Manual payment received",
          method,
          platformType: platform_type.PARTNER,
          completedAt: disburseDate ? new Date(disburseDate) : new Date(),
          externalRef,
          externalUrl: null,
          failureReason: null,
          updatedAt: new Date(),
          paymentDetails: JSON.stringify({
            ...amount,
            ...partialCollection,
            amount: Number(amount.amount) + Number(excessAmount),
            excessAmount,
          }),
          totalFees: +partialCollection.totalFees,
          totalTaxes: 0,
          totalPenalties: +partialCollection.totalPenalties,
          amount: Number(partialCollection.amount) + Number(excessAmount),
          penaltyDiscount: +partialCollection.discountSummary.penalty,
          roundOffDiscount:
            +partialCollection.discountSummary.roundOffDiscount.total,
          principalAmount: +partialCollection.principalAmount,
          isReloanApplicable,
          reloanRemark,
          isPaymentComplete:
            partialCollection?.paymentDetails?.remainingDueAfterPayment === 0
              ? true
              : isPaymentComplete,
          excessAmount: +excessAmount,
          createdByPartnerId: partnerUserId,
          brand_bank_id: brandBankAccountId || null,
          ppct_loan_id: loan.id,
        },
      });
    if (uploadedFiles.length > 0) {
      await this.prisma.paymentTransactionReceipt.createMany({
        data: uploadedFiles.map((f) => ({
          partialTransactionId: paymentTransaction.id,
          receiptKey: f.key,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      });
    }

    const parts = [
      loan.user.userDetails.firstName,
      loan.user.userDetails.middleName,
      loan.user.userDetails.lastName,
    ].filter(Boolean);
    const fullName = parts.join(" ");

    let createOrder = null;
    if (generatePaymentLink) {
      createOrder = await this.createPaymentOrder({
        paymentRequestId: payment.id,
        paymentTransactionId: paymentTransaction.id,
        amount: Number(paymentTransaction.amount),
        fullName: fullName,
        phoneNumber: loan.user.phoneNumber,
        panNumber: pan.documentNumber,
        loanId: loan.id,
        receiptId: paymentTransaction.receiptId,
        platformType: platform_type.WEB,
        transactionType: TransactionTypeEnum.PARTIAL_COLLECTION,
        method: method,
        formattedUserId: user.formattedUserId,
        formattedLoanId: loan.formattedLoanId,
        web_hostname: `${loan.user.brandSubDomain?.subdomain || loan.brand?.brand_sub_domains?.[0]?.subdomain}`,
        userId: user.id,
      });
    }

    if (generatePaymentLink) {
      if (!(createOrder?.order_id && createOrder?.status)) {
        await this.prisma.paymentPartialCollectionTransaction.update({
          where: { id: paymentTransaction.id },
          data: {
            status: TransactionStatusEnum.FAILED,
            failureReason: `Failed to create payment order with ${method}.`,
          },
        });
        throw new InternalServerErrorException(
          `Failed to create payment order with ${method}.`,
        );
      }

      // Update transaction with gateway-specific data
      const updateData: any = {
        externalRef: createOrder.order_id,
      };

      if (method === PaymentMethodEnum.PAYTERNING) {
        const decodedUrl = Buffer.from(createOrder.url, "base64").toString(
          "utf-8",
        );
        updateData.externalUrl = createOrder.url;
        updateData.paymentLink = decodedUrl;
      } else if (method === PaymentMethodEnum.RAZORPAY) {
        const encodedUrl = Buffer.from(createOrder.url).toString("base64");
        updateData.externalUrl = encodedUrl;
        updateData.paymentLink = createOrder.url;
      } else if (method === PaymentMethodEnum.CASHFREE) {
        updateData.externalUrl = createOrder.url;
        updateData.paymentLink = createOrder.url;
      }

      paymentTransaction =
        await this.prisma.paymentPartialCollectionTransaction.update({
          where: { id: paymentTransaction.id },
          data: updateData,
        });
    } else if (paymentRequestStatus === TransactionStatusEnum.SUCCESS) {
      await this.prisma.paymentRequest.update({
        where: { id: payment.id },
        data: { status: paymentRequestStatus },
      });
    }

    try {
      await this.sendPaymentCreatedNotification(
        paymentTransaction.id,
        loan,
        user,
        "Partial Collection",
        partnerUserId,
      );
    } catch (notificationError) {
      console.error(
        `Failed to send payment creation notification: ${notificationError.message}`,
        notificationError.stack,
      );
    }

    return paymentTransaction;
  }

  async updateOpsApprovalStatus(
    partnerUserId: string,
    paymentRequestId: string,
    reason: string,
    paymentCollectionTransactionId?: string,
    paymentPartialCollectionTransactionId?: string,
    opsApprovalStatus: OpsApprovalStatusEnum = OpsApprovalStatusEnum.APPROVED,
    closingType?: string,
  ): Promise<boolean> {
    if (!paymentRequestId) {
      throw new BadRequestException("Payment request ID is required.");
    }
    if (
      !paymentCollectionTransactionId &&
      !paymentPartialCollectionTransactionId
    ) {
      throw new BadRequestException(
        "Either paymentCollectionTransactionId or paymentPartialCollectionTransactionId is required.",
      );
    }

    if (
      paymentCollectionTransactionId ||
      paymentPartialCollectionTransactionId
    ) {
      if (paymentCollectionTransactionId) {
        const externalRef =
          await this.prisma.paymentCollectionTransaction.findUnique({
            where: {
              id: paymentCollectionTransactionId,
              status: TransactionStatusEnum.SUCCESS,
            },
          });
        if (!externalRef) {
          throw new NotFoundException(
            "Payment collection transaction not found.",
          );
        }
        if (externalRef.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED) {
          throw new BadRequestException(
            "Payment collection transaction is already approved.",
          );
        }
      }
      if (paymentPartialCollectionTransactionId) {
        const externalRef =
          await this.prisma.paymentPartialCollectionTransaction.findUnique({
            where: {
              id: paymentPartialCollectionTransactionId,
              status: TransactionStatusEnum.SUCCESS,
            },
          });
        if (!externalRef) {
          throw new NotFoundException(
            "Payment partial collection transaction not found.",
          );
        }
        if (externalRef.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED) {
          throw new BadRequestException(
            "Payment partial collection transaction is already approved.",
          );
        }
      }
    }

    const paymentRequest = await this.prisma.paymentRequest.findUnique({
      where: { id: paymentRequestId },
      select: { type: true, loanId: true, brandId: true, userId: true },
    });

    const brandConfig = await this.prisma.brandConfig.findUnique({
      where: { brandId: paymentRequest?.brandId || "" },
      select: { autoGenerateNOC: true },
    });
    const autoGenerateNOC = brandConfig?.autoGenerateNOC;

    if (!paymentRequest) {
      throw new NotFoundException("Payment request not found.");
    }
    if (!paymentRequest.loanId) {
      throw new NotFoundException("Loan ID not found in payment request.");
    }

    await this.prisma.$transaction(async (prisma) => {
      switch (paymentRequest.type) {
        case TransactionTypeEnum.COLLECTION:
          if (!paymentCollectionTransactionId) {
            throw new BadRequestException(
              "paymentCollectionTransactionId is required for COLLECTION type.",
            );
          }
          const paymentCollectionTransaction =
            await prisma.paymentCollectionTransaction.update({
              where: { id: paymentCollectionTransactionId },
              data: {
                opsApprovalStatus,
                pct__approved_at:
                  opsApprovalStatus === OpsApprovalStatusEnum.APPROVED
                    ? new Date()
                    : null,
                opsRemark: reason,
                opsPartnerId: partnerUserId, // Track who handled the operations
              },
            });

          if (opsApprovalStatus === OpsApprovalStatusEnum.APPROVED) {
            const paymentRequest = await this.prisma.paymentRequest.update({
              where: { id: paymentRequestId },
              data: {
                status: TransactionStatusEnum.SUCCESS,
              },
            });
            // Auto NOC generation
            if (
              autoGenerateNOC &&
              paymentRequest.status === TransactionStatusEnum.SUCCESS
            ) {
              try {
                if (this.awsNOCSqsService) {
                  const trackingId = `AUTO-NOC-${Date.now()}-${uuid().substring(0, 8)}`;
                  await this.awsNOCSqsService.sendToNOCQueue({
                    trackingId,
                    loanId: paymentRequest.loanId,
                    paymentRequestId,
                    partnerUserId,
                    brandId: paymentRequest.brandId,
                    timestamp: new Date().toISOString(),
                    type: "AUTO_NOC_GENERATION",
                    status: "QUEUED",
                  });
                }
              } catch (error) {
                console.error("❌ Error in auto NOC queuing:", error);
              }
            }

            if (paymentCollectionTransaction.isReloanApplicable) {
              await this.prisma.userReloan.create({
                data: {
                  userId: paymentRequest.userId,
                  previousLoanId: paymentRequest.loanId,

                  status: ReloanStatus.PENDING,
                  reason: null,
                  remarks:
                    paymentCollectionTransaction.reloanRemark ||
                    "You're pre-approved for a reloan 🎉",
                },
              });
            }

            // Determine closing type: use passed parameter if provided, otherwise use transaction closing type
            const effectiveClosingType =
              closingType || paymentCollectionTransaction.closingType;

            if (effectiveClosingType === closingTypeEnum.WRITE_OFF) {
              // update loan closing type to WRITE_OFF
              await this.prisma.loan.update({
                where: { id: paymentRequest.loanId },
                data: {
                  // status: loan_status_enum.WRITE_OFF  ,
                  closingType: closingTypeEnum.WRITE_OFF,
                },
              });
              await this.partnerLoansService.updateLoanStatus(partnerUserId, {
                loanId: paymentRequest.loanId,
                status: loan_status_enum.WRITE_OFF,
                reason: "Manual payment initiated",
              });
            } else if (effectiveClosingType === closingTypeEnum.SETTLEMENT) {
              // update loan closing type to SETTLEMENT
              await this.prisma.loan.update({
                where: { id: paymentRequest.loanId },
                data: {
                  // status: loan_status_enum.SETTLED,
                  closingType: closingTypeEnum.SETTLEMENT,
                },
              });
              await this.partnerLoansService.updateLoanStatus(partnerUserId, {
                loanId: paymentRequest.loanId,
                status: loan_status_enum.SETTLED,
                reason: "Manual payment initiated",
              });
            } else {
              await this.partnerLoansService.updateLoanStatus(partnerUserId, {
                loanId: paymentRequest.loanId,
                status: loan_status_enum.COMPLETED,
                reason:
                  "Full payment approved by ops - marking loan as COMPLETED",
              });
              // Auto NOC generation
              if (autoGenerateNOC) {
                try {
                  if (this.awsNOCSqsService) {
                    const trackingId = `AUTO-NOC-${Date.now()}-${uuid().substring(0, 8)}`;
                    await this.awsNOCSqsService.sendToNOCQueue({
                      trackingId,
                      loanId: paymentRequest.loanId,
                      paymentRequestId,
                      partnerUserId,
                      brandId: paymentRequest.brandId,
                      timestamp: new Date().toISOString(),
                      type: "AUTO_NOC_GENERATION",
                      status: "QUEUED",
                    });
                  }
                } catch (error) {
                  console.error("❌ Error in auto NOC queuing:", error);
                }
              }
            }
          }
          break;

        case TransactionTypeEnum.PARTIAL_COLLECTION:
          if (!paymentPartialCollectionTransactionId) {
            throw new BadRequestException(
              "paymentPartialCollectionTransactionId is required for PARTIAL_COLLECTION type.",
            );
          }

          const paymentPartialCollectionTransaction =
            await prisma.paymentPartialCollectionTransaction.update({
              where: { id: paymentPartialCollectionTransactionId },
              data: {
                opsApprovalStatus,
                ppct__approved_at:
                  opsApprovalStatus === OpsApprovalStatusEnum.APPROVED
                    ? new Date()
                    : null,
                opsRemark: reason,
                opsPartnerId: partnerUserId, // Track who handled the operations
              },
            });

          if (opsApprovalStatus === OpsApprovalStatusEnum.APPROVED) {
            if (paymentPartialCollectionTransaction.isReloanApplicable) {
              await this.prisma.userReloan.create({
                data: {
                  userId: paymentRequest.userId,
                  previousLoanId: paymentRequest.loanId,
                  status: ReloanStatus.PENDING,
                  reason: null,
                  remarks:
                    paymentPartialCollectionTransaction.reloanRemark ||
                    "You're pre-approved for a reloan 🎉",
                },
              });
            }

            // Determine closing type: use passed parameter if provided, otherwise use transaction closing type
            const effectivePartialClosingType =
              closingType || paymentPartialCollectionTransaction.closingType;

            // Handle WRITE_OFF closing type
            if (effectivePartialClosingType === closingTypeEnum.WRITE_OFF) {
              await this.prisma.paymentRequest.update({
                where: { id: paymentRequestId },
                data: {
                  status: TransactionStatusEnum.SUCCESS,
                },
              });
              // update loan closing type to WRITE_OFF
              await this.prisma.loan.update({
                where: { id: paymentRequest.loanId },
                data: {
                  closingType: closingTypeEnum.WRITE_OFF,
                },
              });
              await this.partnerLoansService.updateLoanStatus(partnerUserId, {
                loanId: paymentRequest.loanId,
                status: loan_status_enum.WRITE_OFF,
                reason: "Manual payment initiated with WRITE_OFF closing",
              });
            }
            // Handle SETTLEMENT closing type
            else if (
              effectivePartialClosingType === closingTypeEnum.SETTLEMENT
            ) {
              await this.prisma.paymentRequest.update({
                where: { id: paymentRequestId },
                data: {
                  status: TransactionStatusEnum.SUCCESS,
                },
              });
              // update loan closing type to SETTLEMENT
              await this.prisma.loan.update({
                where: { id: paymentRequest.loanId },
                data: {
                  closingType: closingTypeEnum.SETTLEMENT,
                },
              });
              await this.partnerLoansService.updateLoanStatus(partnerUserId, {
                loanId: paymentRequest.loanId,
                status: loan_status_enum.SETTLED,
                reason: "Manual payment initiated with SETTLEMENT closing",
              });
            }
            // Handle NORMAL closing (no special closing type)
            else {
              if (paymentPartialCollectionTransaction.isPaymentComplete) {
                // if payment is complete, update the payment request status to SUCCESS
                const paymentRequest = await this.prisma.paymentRequest.update({
                  where: { id: paymentRequestId },
                  data: {
                    status: TransactionStatusEnum.SUCCESS,
                  },
                });
                // Auto NOC generation
                if (
                  autoGenerateNOC &&
                  paymentRequest.status === TransactionStatusEnum.SUCCESS
                ) {
                  try {
                    if (this.awsNOCSqsService) {
                      const trackingId = `AUTO-NOC-${Date.now()}-${uuid().substring(0, 8)}`;
                      await this.awsNOCSqsService.sendToNOCQueue({
                        trackingId,
                        loanId: paymentRequest.loanId,
                        paymentRequestId,
                        partnerUserId,
                        brandId: paymentRequest.brandId,
                        timestamp: new Date().toISOString(),
                        type: "AUTO_NOC_GENERATION",
                        status: "QUEUED",
                      });
                    }
                  } catch (error) {
                    console.error("❌ Error in auto NOC queuing:", error);
                  }
                }
                await this.partnerLoansService.updateLoanStatus(partnerUserId, {
                  loanId: paymentRequest.loanId,
                  status: loan_status_enum.COMPLETED,
                  reason:
                    "PARTIAL payment approved by ops - marking loan as COMPLETED",
                });
              } else {
                await this.partnerLoansService.updateLoanStatus(partnerUserId, {
                  loanId: paymentRequest.loanId,
                  status: loan_status_enum.PARTIALLY_PAID,
                  reason:
                    "PARTIAL payment approved by ops - marking loan as PARTIALLY_PAID",
                });
              }
            }
          } else {
            await this.prisma.paymentRequest.update({
              where: { id: paymentRequestId },
              data: {
                status: TransactionStatusEnum.PENDING,
              },
            });
          }
          break;

        default:
          throw new BadRequestException(
            `Unsupported payment request type: ${paymentRequest.type}`,
          );
      }
    });
    // Send notifications after successful payment status update
    try {
      await this.sendPaymentStatusNotifications(
        partnerUserId,
        paymentRequestId,
        opsApprovalStatus,
        reason,
        paymentCollectionTransactionId,
        paymentPartialCollectionTransactionId,
      );
    } catch (notificationError) {
      console.error(
        `Failed to send payment status notifications: ${notificationError.message}`,
        notificationError.stack,
      );
      // Don't fail the entire operation if notifications fail
    }

    return true;
  }

  async getPaymentRequestByLoanId(loanId: string) {
    if (!loanId) {
      throw new BadRequestException("Loan ID is required.");
    }
    const paymentRequest = await this.prisma.paymentRequest.findMany({
      where: {
        loanId: loanId,
      },
      include: {
        user: true,
        brand: true,
        disbursalTransactions: {
          include: {
            createdByPartner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            opsByPartner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        partialCollectionTransactions: {
          where: {
            status: {
              in: [
                TransactionStatusEnum.SUCCESS,
                TransactionStatusEnum.PENDING,
              ],
            },
          },
          include: {
            receipt: true,
            createdByPartner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            opsByPartner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        collectionTransactions: {
          where: {
            status: {
              in: [
                TransactionStatusEnum.SUCCESS,
                TransactionStatusEnum.PENDING,
              ],
            },
          },
          include: {
            receipt: true,
            createdByPartner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            opsByPartner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
    return paymentRequest || [];
  }

  private async sendPaymentStatusNotifications(
    partnerUserId: string,
    paymentRequestId: string,
    opsApprovalStatus: OpsApprovalStatusEnum,
    reason: string,
    paymentCollectionTransactionId?: string,
    paymentPartialCollectionTransactionId?: string,
  ) {
    // Get payment request details
    const paymentRequest = await this.prisma.paymentRequest.findUnique({
      where: { id: paymentRequestId },
      include: {
        loan: {
          include: {
            user: {
              include: {
                userDetails: true,
              },
            },
          },
        },
      },
    });

    if (!paymentRequest) {
      throw new NotFoundException(
        "Payment request not found for notifications",
      );
    }

    const loan = paymentRequest.loan;
    const user = loan.user;
    const userName =
      user?.userDetails?.firstName && user?.userDetails?.lastName
        ? `${user.userDetails.firstName} ${user.userDetails.lastName}`
        : user?.formattedUserId || "Unknown User";
    const contactInfo = user?.phoneNumber || user?.email || "No contact";
    const loanIdDisplay = loan.formattedLoanId || loan.id;

    let transactionType = "";
    let createdByPartnerId: string | null = null;

    // Get transaction details and createdByPartnerId
    if (paymentCollectionTransactionId) {
      const transaction =
        await this.prisma.paymentCollectionTransaction.findUnique({
          where: { id: paymentCollectionTransactionId },
          select: { createdByPartnerId: true },
        });
      transactionType = "Collection";
      createdByPartnerId = transaction?.createdByPartnerId || null;
    } else if (paymentPartialCollectionTransactionId) {
      const transaction =
        await this.prisma.paymentPartialCollectionTransaction.findUnique({
          where: { id: paymentPartialCollectionTransactionId },
          select: { createdByPartnerId: true },
        });
      transactionType = "Partial Collection";
      createdByPartnerId = transaction?.createdByPartnerId || null;
    }

    // 1. Notify all users with LOAN_OPS role when payment is updated
    const loanOpsUsers = await this.prisma.partnerUser.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            brandRoles: {
              some: {
                brandId: loan.brandId,
              },
            },
          },
          {
            userPermissions: {
              some: {
                partnerPermission: {
                  name: "LOAN_OPS",
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (loanOpsUsers.length > 0) {
      const statusText =
        opsApprovalStatus === OpsApprovalStatusEnum.APPROVED
          ? "approved"
          : "rejected";
      await this.notificationService.create({
        title: `Payment ${transactionType} ${statusText}`,
        message: `${transactionType} payment for loan ${loanIdDisplay} has been ${statusText}. Customer: ${userName} (${contactInfo}), Amount: ₹${loan.amount}. Reason: ${reason}`,
        priority: notification_priority_enum.HIGH,
        loanId: loan.id,
        userId: user.id,
        brandId: loan.brandId,
        partnerRoleId: getRoleId(RoleEnum.LOAN_OPS),
        targets: loanOpsUsers.map((user) => ({
          partnerUserId: user.id,
          platform: platform_type.PARTNER,
        })),
      });
    }

    // 2. Notify createdByPartnerId when payment is approved or rejected
    if (createdByPartnerId && createdByPartnerId !== partnerUserId) {
      const statusText =
        opsApprovalStatus === OpsApprovalStatusEnum.APPROVED
          ? "approved"
          : "rejected";
      const statusColor =
        opsApprovalStatus === OpsApprovalStatusEnum.APPROVED ? "✅" : "❌";

      await this.notificationService.create({
        title: `Your Payment ${transactionType} ${statusText} ${statusColor}`,
        message: `Your ${transactionType.toLowerCase()} payment for loan ${loanIdDisplay} has been ${statusText}. Customer: ${userName} (${contactInfo}), Amount: ₹${loan.amount}. Reason: ${reason}`,
        priority:
          opsApprovalStatus === OpsApprovalStatusEnum.APPROVED
            ? notification_priority_enum.HIGH
            : notification_priority_enum.MEDIUM,
        loanId: loan.id,
        userId: user.id,
        brandId: loan.brandId,
        createdByPartnerId: partnerUserId,
        targets: [
          {
            partnerUserId: createdByPartnerId,
            platform: platform_type.PARTNER,
          },
        ],
      });
    }
  }

  private async sendPaymentCreatedNotification(
    paymentTransactionId: string,
    loan: any,
    user: any,
    transactionType: string,
    createdByPartnerId: string,
  ) {
    const userName =
      user?.userDetails?.firstName && user?.userDetails?.lastName
        ? `${user.userDetails.firstName} ${user.userDetails.lastName}`
        : user?.formattedUserId || "Unknown User";
    const contactInfo = user?.phoneNumber || user?.email || "No contact";
    const loanIdDisplay = loan.formattedLoanId || loan.id;

    // Notify all users with LOAN_OPS role about new payment creation
    const loanOpsUsers = await this.prisma.partnerUser.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            brandRoles: {
              some: {
                brandId: loan.brandId,
              },
            },
          },
          {
            userPermissions: {
              some: {
                partnerPermission: {
                  name: "LOAN_OPS",
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (loanOpsUsers.length > 0) {
      await this.notificationService.create({
        title: `New ${transactionType} Payment Created 💰`,
        message: `A new ${transactionType.toLowerCase()} payment has been created for loan ${loanIdDisplay}. Customer: ${userName} (${contactInfo}), Amount: ₹${loan.amount}. Awaiting approval.`,
        priority: notification_priority_enum.HIGH,
        loanId: loan.id,
        userId: user.id,
        brandId: loan.brandId,
        partnerRoleId: getRoleId(RoleEnum.LOAN_OPS),
        createdByPartnerId,
        targets: loanOpsUsers.map((opsUser) => ({
          partnerUserId: opsUser.id,
          platform: platform_type.PARTNER,
        })),
      });
    }
  }

  async bulkDisbursement(
    partnerUserId: string,
    disbursements: {
      formattedLoanId: string;
      method: PaymentMethodEnum;
      externalRef: string;
      brandBankAccountId: string;
      disbursementDate?: string | null;
    }[],
    partnerUser: PartnerUser,
  ) {
    const results: {
      formattedLoanId: string;
      success: boolean;
      error?: string;
    }[] = [];

    let successful = 0;
    let failed = 0;

    // Process in chunks of 5 to avoid overwhelming the system
    const CHUNK_SIZE = 5;
    const CONCURRENT_LIMIT = 3;

    for (let i = 0; i < disbursements.length; i += CHUNK_SIZE) {
      const chunk = disbursements.slice(i, i + CHUNK_SIZE);

      // Process chunk with concurrency limit
      const chunkPromises = chunk.map((disbursement, index) =>
        this.processSingleDisbursement(
          disbursement,
          partnerUserId,
          partnerUser,
        ),
      );

      // Execute with concurrency limit
      for (let j = 0; j < chunkPromises.length; j += CONCURRENT_LIMIT) {
        const concurrentBatch = chunkPromises.slice(j, j + CONCURRENT_LIMIT);
        const batchResults = await Promise.all(concurrentBatch);

        for (const result of batchResults) {
          results.push(result);
          if (result.success) {
            successful++;
          } else {
            failed++;
          }
        }
      }
    }

    return {
      success: failed === 0,
      total: disbursements.length,
      successful,
      failed,
      results,
    };
  }

  private async processSingleDisbursement(
    disbursement: {
      formattedLoanId: string;
      method: PaymentMethodEnum;
      externalRef: string;
      brandBankAccountId: string;
      disbursementDate?: string | null;
    },
    partnerUserId: string,
    partnerUser: PartnerUser,
  ): Promise<{
    formattedLoanId: string;
    success: boolean;
    error?: string;
  }> {
    try {
      // Look up loan by formattedLoanId
      const loan = await this.prisma.loan.findFirst({
        where: { formattedLoanId: disbursement.formattedLoanId },
        select: {
          id: true,
          formattedLoanId: true,
        },
      });

      if (!loan) {
        throw new NotFoundException(
          `Loan not found with formatted ID: ${disbursement.formattedLoanId}`,
        );
      }

      // Look up payment request for this loan
      const paymentRequest = await this.createDisburseLoanRequest(loan.id);

      if (!paymentRequest) {
        throw new NotFoundException(
          `Payment request not found for loan: ${disbursement.formattedLoanId}`,
        );
      }

      await this.handleDisbursementTransaction(
        partnerUserId,
        paymentRequest.id,
        loan.id,
        disbursement.method,
        disbursement.externalRef,
        disbursement.disbursementDate || null,
        disbursement.brandBankAccountId,
        null,
        partnerUser,
      );

      return {
        formattedLoanId: disbursement.formattedLoanId,
        success: true,
      };
    } catch (error) {
      return {
        formattedLoanId: disbursement.formattedLoanId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async parseDisbursementCsv(csvContent: string): Promise<
    {
      formattedLoanId: string;
      method: PaymentMethodEnum;
      externalRef: string;
      brandBankAccountId: string;
      disbursementDate?: string | null;
    }[]
  > {
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (csvContent.length > maxSize) {
      throw new BadRequestException(
        `CSV file is too large. Maximum size is 5MB. Current size: ${(csvContent.length / 1024 / 1024).toFixed(2)}MB`,
      );
    }

    const lines = csvContent.trim().split("\n");

    if (lines.length < 2) {
      throw new BadRequestException(
        "CSV file must contain header and at least one data row",
      );
    }

    // Limit to 500 rows to prevent overwhelming the system
    if (lines.length > 501) {
      throw new BadRequestException(
        `CSV file contains too many rows. Maximum is 500 data rows. Current: ${lines.length - 1}`,
      );
    }

    const header = lines[0].toLowerCase().replace(/\r/g, "").split(",");
    const expectedHeaders = [
      "formattedloanid",
      "method",
      "externalref",
      "brandbankaccountid",
    ];

    // Validate required headers
    const hasRequiredHeaders = expectedHeaders.every((h) =>
      header.some((col) => col.trim() === h),
    );

    if (!hasRequiredHeaders) {
      throw new BadRequestException(
        `CSV must contain these headers: ${expectedHeaders.join(", ")} (case-insensitive). Optional: disbursementDate`,
      );
    }

    const disbursements = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].replace(/\r/g, "").trim();
      if (!line) continue; // Skip empty lines

      const values = line.split(",").map((v) => v.trim());

      if (values.length < header.length) {
        errors.push(`Row ${i + 1}: Insufficient columns`);
        continue;
      }

      const formattedLoanId = values[header.indexOf("formattedloanid")]?.trim();
      const method = values[header.indexOf("method")]?.trim().toUpperCase();
      const externalRef = values[header.indexOf("externalref")]?.trim();
      const brandBankAccountId =
        values[header.indexOf("brandbankaccountid")]?.trim();
      const disbursementDate = header.includes("disbursementdate")
        ? values[header.indexOf("disbursementdate")]?.trim() || null
        : null;
      const missingFields: string[] = [];

      if (!formattedLoanId) missingFields.push("formattedLoanId");
      if (!method) missingFields.push("method");
      if (!externalRef) missingFields.push("externalRef");
      if (!brandBankAccountId) missingFields.push("brandBankAccountId");

      if (missingFields.length > 0) {
        errors.push(
          `Row ${i + 1}: Missing required field(s): ${missingFields.join(", ")}.`,
        );
        continue;
      }

      if (
        !Object.values(PaymentMethodEnum).includes(method as PaymentMethodEnum)
      ) {
        errors.push(
          `Row ${i + 1}: Invalid payment method. Must be one of: ${Object.values(PaymentMethodEnum).join(", ")}`,
        );
        continue;
      }

      disbursements.push({
        formattedLoanId,
        method: method as PaymentMethodEnum,
        externalRef,
        brandBankAccountId,
        disbursementDate,
      });
    }

    // If there are any validation errors, throw them all at once
    if (errors.length > 0) {
      const errorSummary = errors.slice(0, 10).join("; ");
      const moreErrors =
        errors.length > 10 ? `\n... and ${errors.length - 10} more errors` : "";
      throw new BadRequestException(
        `CSV validation failed:\n${errorSummary}${moreErrors}`,
      );
    }

    if (disbursements.length === 0) {
      throw new BadRequestException("CSV file contains no valid data rows");
    }

    return disbursements;
  }

  async initiatePublicLoanInquiry(
    identifier: string,
    identifierType: "MOBILE" | "PAN",
  ): Promise<{
    id: string;
    phoneNumber: string;
    expiresIn: number;
    rateLimit: { remaining: number; retryAfter: number };
  }> {
    try {
      // Validate identifier type
      if (!["MOBILE", "PAN"].includes(identifierType)) {
        throw new BadRequestException("Invalid identifier type");
      }

      // Rate limiting: Check attempts in last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes in milliseconds

      const recentAttempts = await this.prisma.public_loan_inquiries.count({
        where: {
          identifier,
          identifierType,
          otpSentAt: {
            gte: fiveMinutesAgo,
          },
        },
      });
      let phoneNumber = "";

      // Allow maximum 5 attempts in 5 minutes
      if (recentAttempts >= 5) {
        // Get the oldest attempt to calculate retry time
        const oldestAttempt = await this.prisma.public_loan_inquiries.findFirst(
          {
            where: {
              identifier,
              identifierType,
              otpSentAt: {
                gte: fiveMinutesAgo,
              },
            },
            orderBy: {
              otpSentAt: "asc",
            },
          },
        );

        const retryAfterMs = oldestAttempt
          ? oldestAttempt.otpSentAt!.getTime() + 5 * 60 * 1000 - Date.now()
          : 0;
        const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

        throw new BadRequestException(
          `Too many attempts. Please try again after ${retryAfterSeconds} seconds.`,
        );
      }

      // Generate OTP and session details
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresIn = 600; // 10 minutes in seconds
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Create the inquiry record
      const inquiry = await this.prisma.public_loan_inquiries.create({
        data: {
          identifier,
          identifierType,
          otp: otpCode,
          expiresAt,
          otpSentAt: new Date(),
        },
      });

      if (!inquiry) {
        throw new InternalServerErrorException(
          "Failed to create public loan inquiry",
        );
      }

      // Send OTP via SMS if identifier is MOBILE
      if (identifierType === "MOBILE") {
        try {
          phoneNumber = identifier;
          await this.smsService.sendSms({
            to: identifier,
            text: `Your loan inquiry OTP is ${otpCode}. This OTP will expire in 10 minutes. Do not share this OTP with anyone.`,
            otp: otpCode,
            name: "Loan Inquiry",
          });
        } catch (smsError) {
          console.error(`smsError`, smsError);
          throw new InternalServerErrorException(
            "Failed to send OTP SMS. Please try again later.",
          );
        }
      }

      if (identifierType === "PAN") {
        const document = await this.prisma.document.findFirst({
          where: {
            documentNumber: identifier,
            type: DocumentTypeEnum.PAN,
          },
          select: {
            user: {
              select: { phoneNumber: true },
            },
          },
        });
        if (document?.user?.phoneNumber) {
          phoneNumber = document?.user?.phoneNumber || "";

          try {
            await this.smsService.sendSms({
              to: document.user.phoneNumber,
              text: `Your loan inquiry OTP is ${otpCode}. This OTP will expire in 10 minutes. Do not share this OTP with anyone.`,
              otp: otpCode,
              name: "Loan Inquiry",
            });
          } catch (smsError) {
            console.error(`smsError`, smsError);
            throw new InternalServerErrorException(
              "Failed to send OTP SMS. Please try again later.",
            );
          }
        }
      }

      const remaining = 5 - recentAttempts - 1; // -1 because we just created one

      // Return with rate limit info
      return {
        id: inquiry.id,
        expiresIn,
        phoneNumber,
        rateLimit: {
          remaining,
          retryAfter: 5 * 60, // 5 minutes in seconds
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to initiate loan inquiry");
    }
  }

  /**
   * Verify OTP and retrieve loan details
   * Returns loan information without storing any user details
   * Rate limited: Maximum 5 attempts per OTP in 5 minutes
   */
  async verifyPublicLoanInquiry(
    sessionId: string,
    otpCode: string,
  ): Promise<{
    success: true;
    data: {
      identifierType: "MOBILE" | "PAN";
      totalLoans: number;
      activeLoans: any[];
      message?: string;
    };
  }> {
    try {
      // Find the inquiry record using sessionId
      const inquiry = await this.prisma.public_loan_inquiries.findUnique({
        where: { id: sessionId },
      });

      if (!inquiry) {
        throw new BadRequestException("Invalid session ID");
      }

      // Check if OTP has expired
      if (inquiry.expiresAt < new Date()) {
        throw new BadRequestException("OTP has expired");
      }
      let failedAttempts = 0;
      if (inquiry.otp !== otpCode) {
        failedAttempts = 1; // First failed attempt

        throw new BadRequestException("Invalid OTP");
      }

      const { identifier, identifierType } = inquiry;
      let user: any;
      if (identifierType === "MOBILE") {
        user = await this.prisma.user.findFirst({
          where: { phoneNumber: identifier },
          select: { id: true },
        });
      } else if (identifierType === "PAN") {
        user = await this.prisma.document.findFirst({
          where: {
            documentNumber: identifier,
            type: DocumentTypeEnum.PAN,
          },
          select: { userId: true },
        });
        if (user) {
          user = { id: user.userId };
        }
      }

      if (!user) {
        throw new NotFoundException(
          "User not found with the provided identifier",
        );
      }

      const userId = user.id;

      // Get all user loans with details - NO user details, only loan info
      const loans = await this.prisma.loan.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: {
          id: true,
          formattedLoanId: true,
          status: true,
          amount: true,
          purpose: true,
          loanType: true,
          applicationDate: true,
          approvalDate: true,
          disbursementDate: true,
          closureDate: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculate loan statistics
      const activeLoans = loans.filter(
        (loan) =>
          loan.status === loan_status_enum.ACTIVE ||
          loan.status === loan_status_enum.POST_ACTIVE ||
          loan.status === loan_status_enum.PARTIALLY_PAID,
      );

      if (loans.length === 0) {
        return {
          success: true,
          data: {
            identifierType,
            totalLoans: 0,
            activeLoans: [],
            message: "No loans found for this user",
          },
        };
      } else if (activeLoans.length === 0 && loans.length > 0) {
        return {
          success: true,
          data: {
            identifierType,
            activeLoans: [],
            totalLoans: 0,
            message: `${loans.length} loan(s) found, but none are active.`,
          },
        };
      }

      return {
        success: true,
        data: {
          identifierType,
          totalLoans: activeLoans.length,
          activeLoans: activeLoans.map((loan) => ({
            id: loan.id,
            formattedLoanId: loan.formattedLoanId,
            status: loan.status,
            amount: loan.amount,
            purpose: loan.purpose,
            loanType: loan.loanType,
            applicationDate: loan.applicationDate,
            approvalDate: loan.approvalDate,
            disbursementDate: loan.disbursementDate,
            closureDate: loan.closureDate,
            createdAt: loan.createdAt,
            updatedAt: loan.updatedAt,
          })),
          message: `${activeLoans.length} active loan(s) found.`,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to verify loan inquiry");
    }
  }

  async getPublicInquiryUser(
    sessionId: string,
    loanId: string,
  ): Promise<{ userId: string }> {
    try {
      // Find the inquiry record using sessionId
      const inquiry = await this.prisma.public_loan_inquiries.findUnique({
        where: { id: sessionId },
      });

      if (!inquiry) {
        throw new BadRequestException("Invalid session ID");
      }

      const { identifier, identifierType } = inquiry;

      // Find user by identifier
      let user: any;
      if (identifierType === "MOBILE") {
        user = await this.prisma.user.findFirst({
          where: { phoneNumber: identifier },
          select: { id: true },
        });
      } else if (identifierType === "PAN") {
        user = await this.prisma.document.findFirst({
          where: {
            documentNumber: identifier,
            type: DocumentTypeEnum.PAN,
          },
          select: { userId: true },
        });
        if (user) {
          user = { id: user.userId };
        }
      }

      if (!user) {
        throw new NotFoundException(
          "User not found with the provided identifier",
        );
      }

      // Verify the loan belongs to this user
      const loanExists = await this.prisma.loan.findFirst({
        where: {
          id: loanId,
          userId: user.id,
          isActive: true,
        },
      });

      if (!loanExists) {
        throw new NotFoundException("Loan not found for this user");
      }

      return { userId: user.id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to get inquiry user");
    }
  }

  /**
   * Get current repayment details for a public loan inquiry
   */
  async getPublicLoanRepayment(
    userId: string,
    loanId: string,
    repaymentDate: any,
  ): Promise<any> {
    try {
      if (!loanId) {
        throw new BadRequestException("Loan ID is required");
      }

      if (!userId) {
        throw new BadRequestException("User ID is required");
      }

      // Verify loan exists and belongs to user
      const loan = await this.prisma.loan.findFirst({
        where: {
          id: loanId,
          userId,
          isActive: true,
        },
      });
      if (!loan) {
        throw new NotFoundException("Loan not found for this user");
      }

      // Get current repayment details
      const repaymentDetails = await this.loansService.currentRepayment(
        userId,
        loanId,
        repaymentDate,
      );

      return {
        success: true,
        data: repaymentDetails,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to get loan repayment details",
      );
    }
  }

  /**
   * Create a secure collection payment from public loan inquiry
   * This method ensures the user is verified via OTP before creating payment
   */
  async createPublicCollectionPayment(
    userId: string,
    loanId: string,
    method: PaymentMethodEnum,
    sessionId: string,
  ): Promise<{
    success: true;
    data: {
      paymentLink: string;
    };
  }> {
    try {
      // Validate inputs
      if (!userId) {
        throw new BadRequestException("User ID is required");
      }

      if (!loanId) {
        throw new BadRequestException("Loan ID is required");
      }

      if (!sessionId) {
        throw new BadRequestException("Session ID is required");
      }

      // Step 1: Verify the session still exists and is valid
      const inquiry = await this.prisma.public_loan_inquiries.findUnique({
        where: { id: sessionId },
      });

      if (!inquiry) {
        throw new BadRequestException("Invalid or expired session");
      }

      // Step 2: Verify the OTP hasn't expired
      if (inquiry.expiresAt < new Date()) {
        throw new BadRequestException("Session has expired");
      }
      // Step 3: Verify the loan belongs to the user
      const loan = await this.prisma.loan.findFirst({
        where: {
          id: loanId,
          userId,
          isActive: true,
          status: {
            in: [
              loan_status_enum.ACTIVE,
              loan_status_enum.POST_ACTIVE,
              loan_status_enum.PARTIALLY_PAID,
              loan_status_enum.DISBURSED,
            ],
          },
        },
        include: {
          user: {
            include: {
              userDetails: true,
            },
          },
          loanDetails: true,
        },
      });
      if (!loan) {
        throw new NotFoundException("Loan not found for this user");
      }

      // Step 4: Verify PAN document exists
      const pan = await this.prisma.document.findFirst({
        where: {
          userId,
          type: DocumentTypeEnum.PAN,
          //status: document_status_enum.APPROVED,
        },
        select: {
          id: true,
          documentNumber: true,
        },
      });

      if (!pan) {
        throw new BadRequestException(
          "Approved PAN document not found for the user.",
        );
      }

      // Step 6: Create the payment using existing logic
      const payment = await this.createCollectionPayment(
        loanId,
        userId,
        method,
      );
      return {
        success: true,
        data: {
          paymentLink: payment.paymentLink,
        },
      };
    } catch (error) {
      console.error(`createPublicCollectionPayment error`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to create collection payment",
      );
    }
  }

  /**
   * Helper to enrich transactions with bank names
   */
  private async enrichTransactionsWithBankNames(transactions: any[]) {
    const bankIds = transactions.map((tx) => tx.brand_bank_id).filter(Boolean);

    if (bankIds.length === 0) return transactions;

    const banks = await this.prisma.brandBankAccount.findMany({
      where: { id: { in: bankIds } },
      select: { id: true, bankName: true },
    });

    const bankMap = new Map(banks.map((b) => [b.id, b.bankName]));

    return transactions.map((tx) => ({
      ...tx,
      bankName: tx.brand_bank_id ? bankMap.get(tx.brand_bank_id) : null,
    }));
  }

  /**
   * Get all pending ops approval transactions (both collection and partial collection) - Highly Optimized
   */
  async getAllPendingOpsApprovalTransactions(filters?: {
    brandId?: string;
    loanId?: string;
    limit?: number;
    offset?: number;
    transactionType?: "collection" | "partial_collection" | "all";
    search?: string;
  }) {
    const transactionType = filters?.transactionType || "all";
    const search = filters?.search?.trim() || "";

    // Base filters - only use Prisma-compatible filters here
    const baseFilters: any = {
      status: TransactionStatusEnum.SUCCESS,
      paymentRequest: {
        AND: [
          ...(filters?.brandId ? [{ brandId: filters.brandId }] : []),
          ...(filters?.loanId ? [{ loanId: filters.loanId }] : []),
          {
            loan: {
              status: {
                in: [
                  loan_status_enum.ACTIVE,
                  loan_status_enum.POST_ACTIVE,
                  loan_status_enum.PARTIALLY_PAID,
                ],
              },
            },
          },
        ],
      },
      opsApprovalStatus: OpsApprovalStatusEnum.PENDING,
    };

    // Helper function to filter transactions by search term (application-level)
    const filterBySearch = (transactions: any[], searchTerm: string): any[] => {
      if (!searchTerm) return transactions;

      const lowerSearch = searchTerm.toLowerCase();
      return transactions.filter((tx) => {
        return (
          tx.paymentRequest?.loan?.formattedLoanId
            ?.toLowerCase()
            .includes(lowerSearch) ||
          tx.paymentRequest?.loan?.user?.phoneNumber
            ?.toLowerCase()
            .includes(lowerSearch) ||
          tx.paymentRequest?.loan?.user?.email
            ?.toLowerCase()
            .includes(lowerSearch) ||
          tx.paymentRequest?.loan?.user?.formattedUserId
            ?.toLowerCase()
            .includes(lowerSearch) ||
          tx.paymentRequest?.loan?.user?.userDetails?.firstName
            ?.toLowerCase()
            .includes(lowerSearch) ||
          tx.paymentRequest?.loan?.user?.userDetails?.lastName
            ?.toLowerCase()
            .includes(lowerSearch) ||
          tx.createdByPartner?.name?.toLowerCase().includes(lowerSearch) ||
          tx.method?.toLowerCase().includes(lowerSearch)
        );
      });
    };

    // Common select fields for both transaction types
    const commonSelect = {
      id: true,
      amount: true,
      receiptId: true,
      method: true,
      status: true,
      opsApprovalStatus: true,
      externalRef: true,
      createdAt: true,
      completedAt: true,
      brand_bank_id: true,
      closingType: true,
      createdByPartner: {
        select: {
          name: true,
        },
      },
      paymentRequest: {
        select: {
          id: true,
          type: true,
          loanId: true,
          loan: {
            select: {
              id: true,
              formattedLoanId: true,
              amount: true,
              oldLoanId: true,
              status: true,
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  email: true,
                  formattedUserId: true,
                  userDetails: {
                    select: {
                      firstName: true,
                      lastName: true,
                      middleName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const limit = filters?.limit || 10;
    const offset = filters?.offset || 0;

    if (transactionType === "collection") {
      const data = await this.prisma.paymentCollectionTransaction.findMany({
        where: baseFilters,
        select: commonSelect,
        orderBy: { createdAt: "desc" },
      });

      // Apply search filter at application level
      const filteredData = filterBySearch(data, search);

      // Enrich with bank names
      const enrichedData =
        await this.enrichTransactionsWithBankNames(filteredData);

      // Apply pagination to filtered results
      const paginatedData = enrichedData.slice(offset, offset + limit);
      const total = enrichedData.length;

      return {
        data: paginatedData,
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      };
    }

    if (transactionType === "partial_collection") {
      const data =
        await this.prisma.paymentPartialCollectionTransaction.findMany({
          where: baseFilters,
          select: {
            ...commonSelect,
            isPaymentComplete: true,
            isReloanApplicable: true,
          },
          orderBy: { createdAt: "desc" },
        });

      // Apply search filter at application level
      const filteredData = filterBySearch(data, search);

      // Enrich with bank names
      const enrichedData =
        await this.enrichTransactionsWithBankNames(filteredData);

      // Apply pagination to filtered results
      const paginatedData = enrichedData.slice(offset, offset + limit);
      const total = enrichedData.length;

      return {
        data: paginatedData,
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Get both types in parallel for "all"
    const [collectionTransactions, partialCollectionTransactions] =
      await Promise.all([
        this.prisma.paymentCollectionTransaction.findMany({
          where: baseFilters,
          select: commonSelect,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.paymentPartialCollectionTransaction.findMany({
          where: baseFilters,
          select: {
            ...commonSelect,
            isPaymentComplete: true,
            isReloanApplicable: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    // Apply search filter at application level
    const filteredCollections = filterBySearch(collectionTransactions, search);
    const filteredPartialCollections = filterBySearch(
      partialCollectionTransactions,
      search,
    );

    // Enrich with bank names
    const enrichedCollections =
      await this.enrichTransactionsWithBankNames(filteredCollections);
    const enrichedPartialCollections =
      await this.enrichTransactionsWithBankNames(filteredPartialCollections);

    // Combine results
    const allFiltered = [...enrichedCollections, ...enrichedPartialCollections];
    const total = allFiltered.length;

    return {
      collectionTransactions: enrichedCollections,
      partialCollectionTransactions: enrichedPartialCollections,
      total,
      collectionCount: enrichedCollections.length,
      partialCollectionCount: enrichedPartialCollections.length,
      limit,
      offset,
    };
  }

  /**
   * Get count of pending ops approval transactions - Highly Optimized
   */
  async getPendingOpsApprovalTransactionsCount(filters?: {
    brandId?: string;
    loanId?: string;
  }) {
    const baseWhere = {
      status: TransactionStatusEnum.SUCCESS,
      opsApprovalStatus: OpsApprovalStatusEnum.PENDING,
      paymentRequest: {
        AND: [
          ...(filters?.brandId ? [{ brandId: filters.brandId }] : []),
          ...(filters?.loanId ? [{ loanId: filters.loanId }] : []),
          {
            loan: {
              status: {
                in: [
                  loan_status_enum.ACTIVE,
                  loan_status_enum.POST_ACTIVE,
                  loan_status_enum.PARTIALLY_PAID,
                ],
              },
            },
          },
        ],
      },
    };

    const [collectionCount, partialCollectionCount] = await Promise.all([
      this.prisma.paymentCollectionTransaction.count({
        where: baseWhere,
      }),
      this.prisma.paymentPartialCollectionTransaction.count({
        where: baseWhere,
      }),
    ]);

    return {
      collectionTransactionsCount: collectionCount,
      partialCollectionTransactionsCount: partialCollectionCount,
      total: collectionCount + partialCollectionCount,
    };
  }

  /**
   * Get pending disbursement transactions - Highly Optimized Single Query
   *
   * Filters:
   * - Loans with APPROVED status
   * - Loans with SIGNED agreements
   * - Payment requests of type DISBURSEMENT with status NOT SUCCESS (or no request exists)
   *
   * Returns full transaction data with loan and user details in a single optimized query
   */
  async getPendingDisbursementTransactions(filters?: {
    brandId?: string;
    loanId?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    const brandId = filters?.brandId || undefined;
    if (!brandId) {
      throw new BadRequestException("brandId is required");
    }
    const limit = Math.min(filters?.limit || 10, 100); // Cap at 100
    const offset = Math.max(filters?.offset || 0, 0); // Ensure non-negative
    const search = filters?.search?.trim() || "";

    // Fetch provider + autopay IDs once
    const brandProviders = await this.prisma.brandProvider.findMany({
      where: { brandId, isActive: true, isDisabled: false },
    });

    const apiProviderIds = brandProviders
      .filter((bp) => bp.type === BrandProviderType.UPI_AUTOPAY)
      .map((bp) => bp.id);

    const autoPay =
      apiProviderIds.length > 0
        ? {
            paymentRequests: {
              some: {
                type: TransactionTypeEnum.AUTOPAY_CONSENT,
                status: { in: [TransactionStatusEnum.SUCCESS] },
              },
            },
          }
        : null;

    // Build the where clause
    const whereClause: any = {
      isActive: true,
      user: {
        isActive: true,
      },
      status: {
        in: [
          loan_status_enum.APPROVED,
          loan_status_enum.SANCTION_MANAGER_APPROVED,
        ],
      },
      agreement: {
        status: "SIGNED",
      },
      ...(brandId && { brandId }),
      ...(filters?.loanId && { id: filters.loanId }),
      ...(apiProviderIds.length > 0
        ? {
            OR: [
              ...(autoPay ? [autoPay] : []),
              { skip_auto_pay_consent: true },
            ],
          }
        : {}),
    };

    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        { formattedLoanId: { contains: search, mode: "insensitive" } },
        { user: { phoneNumber: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        {
          user: {
            userDetails: {
              firstName: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          user: {
            userDetails: {
              lastName: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    // Get total count for pagination
    const total = await this.prisma.loan.count({
      where: whereClause,
    });

    const loans = await this.prisma.loan.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        createdAt: true,
        disbursement: {
          select: {
            netAmount: true,
          },
        },
        amount: true,
        formattedLoanId: true,
        brandId: true,
        is_repeat_loan: true,
        is_workflow_automated: true,
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            userDetails: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        agreement: {
          select: {
            status: true,
            signed: true,
            signedAt: true,
          },
        },
      },
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: "desc",
      },
    });

    const loanIds = loans.map((loan) => loan.id);

    const existingDisbursement =
      await this.prisma.paymentDisbursalTransaction.findFirst({
        where: {
          pdt_loan_id: { in: loanIds },
        },
        select: {
          pdt_loan_id: true,
          completedAt: true,
          createdByPartner: {
            select: { name: true },
          },
        },
      });

    const disbursementMap = new Map();

    if (existingDisbursement) {
      disbursementMap.set(existingDisbursement.pdt_loan_id, {
        completedAt: existingDisbursement.completedAt,
        disbursedBy: existingDisbursement.createdByPartner?.name || null,
      });
    }

    const enrichedLoans = loans.map((loan) => ({
      ...loan,
      existingDisbursement: disbursementMap.get(loan.id) || null,
    }));

    return {
      data: enrichedLoans,
      total,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all rejected ops approval transactions (both collection and partial collection) - Highly Optimized
   */
  async getRejectedOpsApprovalTransactions(filters?: {
    brandId?: string;
    loanId?: string;
    limit?: number;
    offset?: number;
    transactionType?: "collection" | "partial_collection" | "all";
    search?: string;
  }) {
    const transactionType = filters?.transactionType || "all";
    const search = filters?.search?.trim() || "";

    const baseFilters: any = {
      status: TransactionStatusEnum.SUCCESS,
      paymentRequest: {
        AND: [
          ...(filters?.brandId ? [{ brandId: filters.brandId }] : []),
          ...(filters?.loanId ? [{ loanId: filters.loanId }] : []),
        ],
      },
      opsApprovalStatus: OpsApprovalStatusEnum.REJECTED,
    };

    // Add search filter if provided
    if (search) {
      baseFilters.OR = [
        {
          paymentRequest: {
            loan: {
              formattedLoanId: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          paymentRequest: {
            loan: {
              user: { phoneNumber: { contains: search, mode: "insensitive" } },
            },
          },
        },
        {
          paymentRequest: {
            loan: {
              user: { email: { contains: search, mode: "insensitive" } },
            },
          },
        },
        {
          paymentRequest: {
            loan: {
              user: {
                formattedUserId: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
        {
          paymentRequest: {
            loan: {
              user: {
                userDetails: {
                  firstName: { contains: search, mode: "insensitive" },
                },
              },
            },
          },
        },
        {
          paymentRequest: {
            loan: {
              user: {
                userDetails: {
                  lastName: { contains: search, mode: "insensitive" },
                },
              },
            },
          },
        },
        {
          createdByPartner: { name: { contains: search, mode: "insensitive" } },
        },
        // Note: 'method' field is an enum and doesn't support 'contains' operator
        // Only exact matches with 'equals' or 'in' are supported for enum fields
      ];
    }

    // Common select fields for both transaction types
    const commonSelect = {
      id: true,
      amount: true,
      receiptId: true,
      method: true,
      status: true,
      opsApprovalStatus: true,
      externalRef: true,
      createdAt: true,
      completedAt: true,
      closingType: true,
      createdByPartner: {
        select: {
          name: true,
        },
      },
      paymentRequest: {
        select: {
          id: true,
          type: true,
          loanId: true,
          loan: {
            select: {
              id: true,
              formattedLoanId: true,
              amount: true,
              oldLoanId: true,
              status: true,
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  email: true,
                  formattedUserId: true,
                  userDetails: {
                    select: {
                      firstName: true,
                      lastName: true,
                      middleName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const limit = filters?.limit || 10;
    const offset = filters?.offset || 0;

    if (transactionType === "collection") {
      const [data, total] = await Promise.all([
        this.prisma.paymentCollectionTransaction.findMany({
          where: baseFilters,
          select: commonSelect,
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.paymentCollectionTransaction.count({
          where: baseFilters,
        }),
      ]);

      return {
        data,
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      };
    }

    if (transactionType === "partial_collection") {
      const [data, total] = await Promise.all([
        this.prisma.paymentPartialCollectionTransaction.findMany({
          where: baseFilters,
          select: {
            ...commonSelect,
            isPaymentComplete: true,
            isReloanApplicable: true,
          },
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.paymentPartialCollectionTransaction.count({
          where: baseFilters,
        }),
      ]);

      return {
        data,
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Get both types in parallel for "all"
    const [
      collectionTransactions,
      collectionCount,
      partialCollectionTransactions,
      partialCollectionCount,
    ] = await Promise.all([
      this.prisma.paymentCollectionTransaction.findMany({
        where: baseFilters,
        select: commonSelect,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paymentCollectionTransaction.count({
        where: baseFilters,
      }),
      this.prisma.paymentPartialCollectionTransaction.findMany({
        where: baseFilters,
        select: {
          ...commonSelect,
          isPaymentComplete: true,
          isReloanApplicable: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paymentPartialCollectionTransaction.count({
        where: baseFilters,
      }),
    ]);

    const total = collectionCount + partialCollectionCount;

    return {
      collectionTransactions,
      partialCollectionTransactions,
      total,
      collectionCount,
      partialCollectionCount,
      limit,
      offset,
    };
  }

  async getPaymentOpsApprovedTransactions(filters?: {
    brandId?: string;
    loanId?: string;
    limit?: number;
    offset?: number;
    transactionType?: "collection" | "partial_collection" | "all";
    search?: string;
  }) {
    const transactionType = filters?.transactionType || "all";
    const search = filters?.search?.trim() || "";

    let baseFilters: any = {
      status: TransactionStatusEnum.SUCCESS,
      paymentRequest: {
        AND: [
          ...(filters?.brandId ? [{ brandId: filters.brandId }] : []),
          ...(filters?.loanId ? [{ loanId: filters.loanId }] : []),
        ],
      },
      opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
    };

    // Add search filter if provided
    if (search) {
      baseFilters.OR = [
        {
          paymentRequest: {
            loan: {
              formattedLoanId: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          paymentRequest: {
            loan: {
              user: { phoneNumber: { contains: search, mode: "insensitive" } },
            },
          },
        },
        {
          paymentRequest: {
            loan: {
              user: { email: { contains: search, mode: "insensitive" } },
            },
          },
        },
        {
          paymentRequest: {
            loan: {
              user: {
                formattedUserId: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
        {
          paymentRequest: {
            loan: {
              user: {
                userDetails: {
                  firstName: { contains: search, mode: "insensitive" },
                },
              },
            },
          },
        },
        {
          paymentRequest: {
            loan: {
              user: {
                userDetails: {
                  lastName: { contains: search, mode: "insensitive" },
                },
              },
            },
          },
        },
        {
          createdByPartner: { name: { contains: search, mode: "insensitive" } },
        },
        // Note: 'method' field is an enum and doesn't support 'contains' operator
        // Only exact matches with 'equals' or 'in' are supported for enum fields
      ];
    }

    // Common select fields for both transaction types
    const commonSelect = {
      id: true,
      amount: true,
      receiptId: true,
      method: true,
      status: true,
      opsApprovalStatus: true,
      externalRef: true,
      createdAt: true,
      completedAt: true,
      closingType: true,

      createdByPartner: {
        select: {
          name: true,
        },
      },
      paymentRequest: {
        select: {
          id: true,
          type: true,
          loanId: true,
          loan: {
            select: {
              id: true,
              formattedLoanId: true,
              amount: true,
              oldLoanId: true,
              status: true,
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  email: true,
                  formattedUserId: true,
                  userDetails: {
                    select: {
                      firstName: true,
                      lastName: true,
                      middleName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const limit = filters?.limit || 10;
    const offset = filters?.offset || 0;

    if (transactionType === "collection") {
      const [data, total] = await Promise.all([
        this.prisma.paymentCollectionTransaction.findMany({
          where: baseFilters,
          select: commonSelect,
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.paymentCollectionTransaction.count({
          where: baseFilters,
        }),
      ]);

      return {
        collectionTransactions: data,
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      };
    }

    if (transactionType === "partial_collection") {
      const [data, total] = await Promise.all([
        this.prisma.paymentPartialCollectionTransaction.findMany({
          where: baseFilters,
          select: {
            ...commonSelect,
            isPaymentComplete: true,
            isReloanApplicable: true,
          },
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.paymentPartialCollectionTransaction.count({
          where: baseFilters,
        }),
      ]);

      return {
        partialCollectionTransactions: data,
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Get all types in parallel for "all"
    const [
      collectionTransactions,
      collectionCount,
      partialCollectionTransactions,
      partialCollectionCount,
    ] = await Promise.all([
      this.prisma.paymentCollectionTransaction.findMany({
        where: baseFilters,
        select: commonSelect,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paymentCollectionTransaction.count({
        where: baseFilters,
      }),
      this.prisma.paymentPartialCollectionTransaction.findMany({
        where: baseFilters,
        select: {
          ...commonSelect,
          isPaymentComplete: true,
          isReloanApplicable: true,
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paymentPartialCollectionTransaction.count({
        where: baseFilters,
      }),
    ]);

    const total = collectionCount + partialCollectionCount;

    return {
      collectionTransactions,
      partialCollectionTransactions,
      total,
      collectionCount,
      partialCollectionCount,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Manual status update endpoint for admins
   * Allows manual update of loan status with audit trail
   */
  async manualStatusUpdate(
    partnerUserId: string,
    loanId: string,
    newStatus: loan_status_enum,
  ): Promise<void> {
    try {
      // Validate loan exists
      const loan = await this.prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          user: true,
          brand: true,
        },
      });

      if (!loan) {
        throw new NotFoundException(`Loan with ID ${loanId} not found`);
      }

      // Use partnerLoansService to update status (handles audit trail, notifications, etc.)
      await this.partnerLoansService.updateLoanStatus(partnerUserId, {
        loanId: loanId,
        status: newStatus,
        reason: "Manual status update via admin API",
      });
    } catch (error) {
      console.error("Error in manual status update:", error);
      throw error;
    }
  }
}
