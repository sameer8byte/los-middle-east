import { HttpService } from "@nestjs/axios";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import * as crypto from "crypto";
import { platform_type, TransactionTypeEnum } from "@prisma/client";

export enum RazorpayPaymentStatus {
  CREATED = "created",
  ATTEMPTED = "attempted",
  PAID = "paid",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: RazorpayPaymentStatus;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

interface RazorpayPaymentLinkResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  accept_partial: boolean;
  first_min_partial_amount: number;
  expire_by: number;
  reference_id: string;
  description: string;
  customer: {
    name: string;
    contact: string;
    email: string;
  };
  notify: {
    sms: boolean;
    email: boolean;
  };
  reminder_enable: boolean;
  notes: Record<string, string>;
  short_url: string;
  status: string;
  created_at: number;
  updated_at: number;
  payments?: Array<{
    // ADD THIS FOR PAYMENT LINK PAYMENTS
    payment_id: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
  }>;
}

interface RazorpayPaymentResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  invoice_id: string | null;
  international: boolean;
  method: string;
  amount_refunded: number;
  refund_status: string | null;
  captured: boolean;
  description: string;
  card_id: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string;
  contact: string;
  notes: Record<string, string>;
  fee: number;
  tax: number;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  acquirer_data: Record<string, string>;
  created_at: number;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly baseUrl =
    process.env.RAZORPAY_BASE_URL || "https://api.razorpay.com/v1";
  private readonly keyId = process.env.RAZORPAY_KEY_ID;
  private readonly keySecret = process.env.RAZORPAY_KEY_SECRET;

  constructor(private readonly httpService: HttpService) {
    this.logger.log("🔧 RazorpayService initialized");
    this.logger.log(`🔑 Key ID configured: ${this.keyId ? "YES" : "NO"}`);
    this.logger.log(
      `🔑 Key Secret configured: ${this.keySecret ? "YES" : "NO"}`,
    );
    this.logger.log(`🌐 Base URL: ${this.baseUrl}`);
  }

  private getAuthHeader(): string {
    if (!this.keyId || !this.keySecret) {
      this.logger.error("❌ Razorpay credentials not configured");
      throw new InternalServerErrorException(
        "Razorpay credentials not configured",
      );
    }
    const credentials = `${this.keyId}:${this.keySecret}`;
    return "Basic " + Buffer.from(credentials).toString("base64");
  }

  /**
   * Create a Razorpay Payment Link (Recommended approach)
   */
  async createOrder(
    paymentRequestId: string,
    paymentTransactionId: string,
    amount: number,
    customerName: string,
    customerPhone: string,
    panNumber: string,
    loanId: string,
    receiptId: string,
    platformType: platform_type,
    transactionType: TransactionTypeEnum,
    formattedUserId: string,
    formattedLoanId: string,
    userId: string,
    web_hostname: string,
  ): Promise<{
    status: boolean;
    url: string;
    order_id: string;
    payment_link_id: string;
    amount: number;
    currency: string;
    reference_id: string;
    description: string;
    formattedUserId: string;
    formattedLoanId: string;
  }> {
    const methodName = "createPaymentLink";
    this.logger.log(`🚀 [${methodName}] Starting payment link creation`);
    this.logger.log(
      `📋 [${methodName}] Input details - Amount: ${amount}, Loan: ${loanId}, Receipt: ${receiptId}`,
    );

    try {
      this.logger.log(
        `💰 [${methodName}] Amount in paise: ${Math.round(amount * 100)}`,
      );

      const url = `${this.baseUrl}/payment_links`;

      // Get current time in IST
      const now = new Date();

      // Convert to IST
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + istOffset);

      // Set expiry to end of same IST day
      istTime.setHours(23, 59, 59, 999);

      // Convert back to UNIX timestamp (seconds)
      const expireBy = Math.floor(istTime.getTime() / 1000);

      const body = {
        amount: Math.round(amount * 100),
        currency: "INR",
        accept_partial: false,
        description: `Loan Repayment - Receipt: ${receiptId}`,
        customer: {
          name: customerName,
          contact: customerPhone,
          email: this.generateTempEmail(customerPhone),
        },
        notify: {
          sms: true,
          email: true,
        },
        reminder_enable: true,
        expire_by: expireBy,
        reference_id: receiptId,
        notes: {
          pan: panNumber,
          loan_id: loanId,
          payment_request_id: paymentRequestId,
          payment_transaction_id: paymentTransactionId,
          platform_type: platformType,
          transaction_type: transactionType,
          customer_name: customerName,
          customer_phone: customerPhone,
          formatted_user_id: formattedUserId,
          formatted_loan_id: formattedLoanId,
        },
        callback_url: `${process.env.WEBHOOK_URL}/api/v1/payment/razorpay/callback`,
        callback_method: "get",
      };

      // this.logger.log(`📤 [${methodName}] Sending request to Razorpay API`);
      // this.logger.debug(
      //   `🔍 [${methodName}] Request body: ${JSON.stringify(body, null, 2)}`
      // );

      const { data } = await firstValueFrom(
        this.httpService.post<RazorpayPaymentLinkResponse>(url, body, {
          headers: {
            "Content-Type": "application/json",
            Authorization: this.getAuthHeader(),
          },
        }),
      );

      // this.logger.log(
      //   `✅ [${methodName}] Razorpay payment link created successfully`
      // );
      // this.logger.log(`🔗 [${methodName}] Payment Link ID: ${data.id}`);
      // this.logger.log(`🌐 [${methodName}] Short URL: ${data.short_url}`);
      // this.logger.log(`💰 [${methodName}] Amount: ${data.amount}`);
      // this.logger.log(`📊 [${methodName}] Status: ${data.status}`);

      return {
        status: true,
        url: data.short_url,
        order_id: data.id,
        payment_link_id: data.id,
        amount: data.amount,
        currency: data.currency,
        reference_id: data.reference_id,
        description: data.description,
        formattedUserId: formattedUserId,
        formattedLoanId: formattedLoanId,
      };
    } catch (error) {
      // this.logger.error(
      //   `❌ [${methodName}] Failed to create Razorpay payment link`
      // );
      // this.logger.error(`💥 [${methodName}] Error: ${error.message}`);
      // this.logger.error(
      //   `🔍 [${methodName}] Response data: ${JSON.stringify(error?.response?.data, null, 2)}`
      // );
      // this.logger.error(
      //   `📡 [${methodName}] Status: ${error?.response?.status}`
      // );
      // this.logger.error(
      //   `🔧 [${methodName}] Headers: ${JSON.stringify(error?.response?.headers, null, 2)}`
      // );

      throw new InternalServerErrorException(
        `Failed to create payment link with Razorpay: ${error?.response?.data?.error?.description || error.message}`,
      );
    }
  }
  /**
   * Fetch Payment Link details
   */
  async fetchPaymentLink(
    paymentLinkId: string,
  ): Promise<RazorpayPaymentLinkResponse> {
    const methodName = "fetchPaymentLink";
    this.logger.log(
      `🔍 [${methodName}] Fetching payment link: ${paymentLinkId}`,
    );

    if (!paymentLinkId) {
      this.logger.error(`❌ [${methodName}] Payment Link ID is required`);
      throw new BadRequestException("Payment Link ID is required");
    }

    const url = `${this.baseUrl}/payment_links/${paymentLinkId}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<RazorpayPaymentLinkResponse>(url, {
          headers: {
            Authorization: this.getAuthHeader(),
          },
        }),
      );

      this.logger.log(`✅ [${methodName}] Payment link fetched successfully`);
      this.logger.log(`📊 [${methodName}] Status: ${data.status}`);
      this.logger.log(
        `💰 [${methodName}] Amount Paid: ${data.amount_paid}, Amount Due: ${data.amount_due}`,
      );

      return data;
    } catch (error) {
      this.logger.error(`❌ [${methodName}] Failed to fetch payment link`);
      this.logger.error(`💥 [${methodName}] Error: ${error.message}`);
      throw new InternalServerErrorException(
        "Failed to fetch payment link from Razorpay",
      );
    }
  }

  /**
   * Fetch Order details
   */
  async fetchOrder(orderId: string): Promise<RazorpayOrderResponse> {
    const methodName = "fetchOrder";
    this.logger.log(`🔍 [${methodName}] Fetching order: ${orderId}`);

    if (!orderId) {
      this.logger.error(`❌ [${methodName}] Order ID is required`);
      throw new BadRequestException("Order ID is required");
    }

    const url = `${this.baseUrl}/orders/${orderId}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<RazorpayOrderResponse>(url, {
          headers: {
            Authorization: this.getAuthHeader(),
          },
        }),
      );

      this.logger.log(`✅ [${methodName}] Order fetched successfully`);
      this.logger.log(`📊 [${methodName}] Status: ${data.status}`);
      this.logger.log(
        `💰 [${methodName}] Amount Paid: ${data.amount_paid}, Amount Due: ${data.amount_due}`,
      );

      return data;
    } catch (error) {
      this.logger.error(`❌ [${methodName}] Failed to fetch order`);
      this.logger.error(`💥 [${methodName}] Error: ${error.message}`);
      throw new InternalServerErrorException(
        "Failed to fetch order from Razorpay",
      );
    }
  }

  /**
   * Fetch Payment details
   */
  async fetchPayment(paymentId: string): Promise<RazorpayPaymentResponse> {
    const methodName = "fetchPayment";
    this.logger.log(`🔍 [${methodName}] Fetching payment: ${paymentId}`);

    if (!paymentId) {
      this.logger.error(`❌ [${methodName}] Payment ID is required`);
      throw new BadRequestException("Payment ID is required");
    }

    const url = `${this.baseUrl}/payments/${paymentId}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<RazorpayPaymentResponse>(url, {
          headers: {
            Authorization: this.getAuthHeader(),
          },
        }),
      );

      this.logger.log(`✅ [${methodName}] Payment fetched successfully`);
      this.logger.log(`📊 [${methodName}] Status: ${data.status}`);
      this.logger.log(`💰 [${methodName}] Amount: ${data.amount}`);
      this.logger.log(`💳 [${methodName}] Method: ${data.method}`);

      return data;
    } catch (error) {
      this.logger.error(`❌ [${methodName}] Failed to fetch payment`);
      this.logger.error(`💥 [${methodName}] Error: ${error.message}`);
      throw new InternalServerErrorException(
        "Failed to fetch payment from Razorpay",
      );
    }
  }

  /**
   * Cancel a Payment Link
   */
  async cancelPaymentLink(paymentLinkId: string): Promise<boolean> {
    const methodName = "cancelPaymentLink";
    this.logger.log(
      `🗑️ [${methodName}] Cancelling payment link: ${paymentLinkId}`,
    );

    if (!paymentLinkId) {
      this.logger.error(`❌ [${methodName}] Payment Link ID is required`);
      throw new BadRequestException("Payment Link ID is required");
    }

    const url = `${this.baseUrl}/payment_links/${paymentLinkId}/cancel`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          url,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: this.getAuthHeader(),
            },
          },
        ),
      );

      this.logger.log(`✅ [${methodName}] Payment link cancelled successfully`);
      this.logger.log(`📊 [${methodName}] New status: ${data.status}`);

      return data.status === "cancelled";
    } catch (error) {
      this.logger.error(`❌ [${methodName}] Failed to cancel payment link`);
      this.logger.error(`💥 [${methodName}] Error: ${error.message}`);
      throw new InternalServerErrorException("Failed to cancel payment link");
    }
  }

  /**
   * Verify webhook signature
   */
  verifyRazorpayWebhookSignature(
    rawBody: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    return expectedSignature === signature;
  }

  /**
   * Generate temporary email for Razorpay (required field)
   */
  private generateTempEmail(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, "");
    const email = `temp.${cleanPhone}@${this.getDomainFromEnv()}`;
    this.logger.debug(`📧 Generated temporary email: ${email}`);
    return email;
  }

  /**
   * Get domain from environment or use default
   */
  private getDomainFromEnv(): string {
    const appUrl = process.env.APP_URL || "8byte.ai";
    try {
      const url = new URL(appUrl);
      return url.hostname;
    } catch {
      return "8byte.ai";
    }
  }

  /**
   * Fetch Payment Link payments
   */
  async fetchPaymentLinkPayments(paymentLinkId: string): Promise<any[]> {
    const methodName = "fetchPaymentLinkPayments";
    this.logger.log(
      `🔍 [${methodName}] Fetching payments for payment link: ${paymentLinkId}`,
    );

    if (!paymentLinkId) {
      this.logger.error(`❌ [${methodName}] Payment Link ID is required`);
      throw new BadRequestException("Payment Link ID is required");
    }

    const url = `${this.baseUrl}/payment_links/${paymentLinkId}/payments`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<any>(url, {
          headers: {
            Authorization: this.getAuthHeader(),
          },
        }),
      );

      this.logger.log(
        `✅ [${methodName}] Payment link payments fetched successfully`,
      );
      this.logger.log(
        `💰 [${methodName}] Number of payments: ${data?.items?.length || 0}`,
      );

      return data?.items || [];
    } catch (error) {
      this.logger.error(
        `❌ [${methodName}] Failed to fetch payment link payments`,
      );
      this.logger.error(`💥 [${methodName}] Error: ${error.message}`);
      throw new InternalServerErrorException(
        "Failed to fetch payment link payments from Razorpay",
      );
    }
  }

  /**
   * Check if payment link has successful payments
   */
  async hasSuccessfulPayment(paymentLinkId: string): Promise<boolean> {
    const methodName = "hasSuccessfulPayment";
    this.logger.log(
      `🔍 [${methodName}] Checking for successful payments: ${paymentLinkId}`,
    );

    try {
      const payments = await this.fetchPaymentLinkPayments(paymentLinkId);
      const successfulPayment = payments.find(
        (payment) =>
          payment.status === "captured" || payment.status === "authorized",
      );

      const hasPayment = !!successfulPayment;
      this.logger.log(
        `📊 [${methodName}] Has successful payment: ${hasPayment}`,
      );

      return hasPayment;
    } catch (error) {
      this.logger.error(`❌ [${methodName}] Failed to check payment status`);
      return false;
    }
  }
}
