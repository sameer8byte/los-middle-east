import { HttpService } from "@nestjs/axios";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import * as CryptoJS from "crypto-js";
import {
  platform_type,
  TransactionTypeEnum,
  TransactionStatusEnum,
} from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

export enum CashfreeLinkStatus {
  ACTIVE = "ACTIVE",
  PAID = "PAID",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

interface CashfreeCustomerDetails {
  customer_name: string;
  customer_phone: string;
  customer_bank_account_number?: string;
  customer_bank_ifsc?: string;
  customer_bank_code?: number;
}

interface CashfreeLinkMeta {
  notify_url: string;
  return_url?: string;
  upi_intent?: boolean;
  payment_methods?: string;
}

interface CashfreeLinkNotes {
  [key: string]: string;
}

interface CashfreeLinkNotify {
  send_sms: boolean;
  send_email: boolean;
}

interface CashfreeCreateLinkRequest {
  link_id: string;
  link_amount: number;
  link_currency: string;
  link_purpose: string;
  customer_details: CashfreeCustomerDetails;
  link_partial_payments?: boolean;
  link_minimum_partial_amount?: number;
  link_expiry_time?: string;
  link_notify?: CashfreeLinkNotify;
  link_auto_reminders?: boolean;
  link_notes?: CashfreeLinkNotes;
  link_meta?: CashfreeLinkMeta;
}

interface CashfreeLinkResponse {
  cf_link_id: string;
  link_id: string;
  link_status: CashfreeLinkStatus;
  link_currency: string;
  link_amount: number;
  link_amount_paid: number;
  link_partial_payments: boolean;
  link_minimum_partial_amount: number;
  link_purpose: string;
  link_created_at: string;
  customer_details: CashfreeCustomerDetails;
  link_meta: CashfreeLinkMeta;
  link_url: string;
  link_expiry_time: string;
  link_notes: CashfreeLinkNotes;
  link_auto_reminders: boolean;
  link_notify: CashfreeLinkNotify;
  link_qrcode?: string;
}

interface CashfreePaymentSuccessWebhook {
  order: {
    order_id: string;
    order_amount: string;
    order_currency: string;
    order_tags: any;
    customer_details: {
      customer_name: string;
      customer_id: string;
      customer_email: string;
      customer_phone: string;
    };
    order_meta: any;
    payment_details: {
      payment_method: string;
      bank_reference: string;
    };
    payment_status: string;
    payment_message: string;
    payment_time: string;
    transaction_id: string;
  };
  payment: {
    payment_amount: string;
    payment_currency: string;
    payment_status: string;
    payment_time: string;
    payment_message: string;
    bank_reference: string;
    auth_id: string;
  };
  data: {
    order: any;
    payment: any;
  };
  type: string;
  version: number;
  event_time: string;
}

interface CashfreeWebhookPayload {
  data: {
    cf_link_id: string;
    link_id: string;
    link_status: CashfreeLinkStatus;
    link_currency: string;
    link_amount: string;
    link_amount_paid: string;
    link_partial_payments: boolean;
    link_minimum_partial_amount: string;
    link_purpose: string;
    link_created_at: string;
    customer_details: {
      customer_phone: string;
      customer_email: string;
      customer_name: string;
    };
    link_meta: {
      notify_url: string;
    };
    link_url: string;
    link_expiry_time: string;
    link_notes: CashfreeLinkNotes;
    link_auto_reminders: boolean;
    link_notify: {
      send_sms: boolean;
      send_email: boolean;
    };
    order?: {
      order_amount: string;
      order_id: string;
      order_expiry_time: string;
      order_hash: string;
      transaction_id: string;
      transaction_status: string;
    };
  };
  type: string;
  version: number;
  event_time: string;
}

interface CashfreeOrderResponse {
  cf_order_id: string;
  link_id: string;
  order_id: string;
  entity: string;
  order_currency: string;
  order_amount: number;
  order_status: string;
  payment_session_id: string;
  order_expiry_time: string;
  order_note: string;
  created_at: string;
  order_splits: any[];
  customer_details: any;
  order_meta: any;
  order_tags: any;
}

interface CashfreeCreateOrderResponse {
  status: boolean;
  url: string;
  order_id: string;
  payment_link_id: string;
  amount: number;
  currency: string;
  reference_id: string;
  description: string;
}

interface CashfreePaymentLinkResponse {
  cf_link_id: string;
  link_id: string;
  link_status: string;
  link_currency: string;
  link_amount: number;
  link_amount_paid: number;
  link_partial_payments: boolean;
  link_minimum_partial_amount: number;
  link_purpose: string;
  link_created_at: string;
  customer_details: {
    customer_name: string;
    customer_phone: string;
    customer_bank_account_number?: string;
    customer_bank_ifsc?: string;
    customer_bank_code?: number;
  };
  link_meta: {
    notify_url: string;
    return_url?: string;
    upi_intent?: boolean;
    payment_methods?: string;
  };
  link_url: string;
  link_expiry_time: string;
  link_notes: Record<string, string>;
  link_auto_reminders: boolean;
  link_notify: {
    send_sms: boolean;
    send_email: boolean;
  };
  link_qrcode?: string;
}

interface CashfreeWebhookResponse {
  success: boolean;
  transactionId?: string;
  status?: string;
  message: string;
}

@Injectable()
export class CashfreeService {
  private readonly logger = new Logger(CashfreeService.name);
  private readonly baseUrl =
    process.env.CASHFREE_BASE_URL || "https://sandbox.cashfree.com/pg";
  private readonly clientId = process.env.CASHFREE_CLIENT_ID;
  private readonly clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  private readonly apiVersion = "2025-01-01";

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService
  ) {
    this.logger.log("CashfreeService initialized");
    this.logger.log(`Client ID configured: ${this.clientId ? "YES" : "NO"}`);
    this.logger.log(
      `Client Secret configured: ${this.clientSecret ? "YES" : "NO"}`
    );
    this.logger.log(`Base URL: ${this.baseUrl}`);
  }

  private getAuthHeaders(): { [key: string]: string } {
    if (!this.clientId || !this.clientSecret) {
      this.logger.error("Cashfree credentials not configured");
      throw new InternalServerErrorException(
        "Cashfree credentials not configured"
      );
    }

    return {
      "x-client-id": this.clientId,
      "x-client-secret": this.clientSecret,
      "x-api-version": this.apiVersion,
      "Content-Type": "application/json",
    };
  }

  /**
   * Create a Cashfree Payment Link
   */
  async createPaymentLink(
    paymentRequestId: string,
    paymentTransactionId: string,
    amount: number,
    customerName: string,
    customerPhone: string,
    panNumber: string,
    loanId: string,
    receiptId: string,
    platformType: platform_type,
    transactionType: TransactionTypeEnum
  ): Promise<CashfreeCreateOrderResponse> {
    const methodName = "createPaymentLink";
    this.logger.log(`[${methodName}] Starting payment link creation`);
    this.logger.log(
      `[${methodName}] Input details - Amount: ${amount}, Loan: ${loanId}, Receipt: ${receiptId}`
    );

    try {
      // First, check if Cashfree provider is active for this transaction type
      await this.validateCashfreeProvider(transactionType);

      this.logger.log(`[${methodName}] Amount: ${amount}`);

      const url = `${this.baseUrl}/links`;

      // Calculate expiry time (7 days from now)
      const expiryTime = new Date();
      expiryTime.setDate(expiryTime.getDate() + 7);
      const linkExpiryTime = expiryTime.toISOString();

      this.logger.log(`[${methodName}] Payment link expiry: ${linkExpiryTime}`);

      const body: CashfreeCreateLinkRequest = {
        link_id: receiptId,
        link_amount: amount,
        link_currency: "INR",
        link_purpose: `Loan Repayment - Receipt: ${receiptId}`,
        customer_details: {
          customer_name: customerName,
          customer_phone: customerPhone,
        },
        link_partial_payments: false,
        link_notify: {
          send_sms: true,
          send_email: true,
        },
        link_auto_reminders: true,
        link_expiry_time: linkExpiryTime,
        link_notes: {
          pan: panNumber,
          loan_id: loanId,
          payment_request_id: paymentRequestId,
          payment_transaction_id: paymentTransactionId,
          transaction_type: transactionType,
        },
        link_meta: {
          notify_url:
            process.env.CASHFREE_CALLBACK_URL ||
            "https://partner.8byte.ai/api/v1/payment/cashfree/callback",
          return_url:
            process.env.CASHFREE_RETURN_URL ||
            "https://partner.8byte.ai/payment/return",
        },
      };

      this.logger.log(`[${methodName}] Sending request to Cashfree API`);
      this.logger.debug(
        `[${methodName}] Request body: ${JSON.stringify(body, null, 2)}`
      );

      const { data } = await firstValueFrom(
        this.httpService.post<CashfreeLinkResponse>(url, body, {
          headers: this.getAuthHeaders(),
        })
      );

      this.logger.log(
        `[${methodName}] Cashfree payment link created successfully`
      );
      this.logger.log(`[${methodName}] Cashfree Link ID: ${data.cf_link_id}`);
      this.logger.log(`[${methodName}] Link URL: ${data.link_url}`);
      this.logger.log(`[${methodName}] Amount: ${data.link_amount}`);
      this.logger.log(`[${methodName}] Status: ${data.link_status}`);

      return {
        status: true,
        url: data.link_url,
        order_id: data.cf_link_id,
        payment_link_id: data.cf_link_id,
        amount: data.link_amount,
        currency: data.link_currency,
        reference_id: data.link_id,
        description: data.link_purpose,
      };
    } catch (error) {
      this.logger.error(
        `[${methodName}] Failed to create Cashfree payment link`
      );
      this.logger.error(`[${methodName}] Error: ${error.message}`);
      this.logger.error(
        `[${methodName}] Response data: ${JSON.stringify(error?.response?.data, null, 2)}`
      );
      this.logger.error(`[${methodName}] Status: ${error?.response?.status}`);

      throw new InternalServerErrorException(
        `Failed to create payment link with Cashfree: ${error?.response?.data?.message || error.message}`
      );
    }
  }

  private async validateCashfreeProvider(
    transactionType: TransactionTypeEnum
  ): Promise<void> {
    const brandProviderType =
      transactionType === TransactionTypeEnum.COLLECTION
        ? "FULL_PAYMENT"
        : "PART_PAYMENT";

    const isActive = await this.prisma.brandProvider.findFirst({
      where: {
        type: brandProviderType,
        provider: "CASHFREE",
        isActive: true,
        isDisabled: false,
      },
    });

    if (!isActive) {
      throw new BadRequestException(
        "Cashfree provider not available for this transaction type"
      );
    }
  }

  /**
   * Fetch Payment Link details
   */
  async fetchPaymentLink(
    paymentLinkId: string
  ): Promise<CashfreePaymentLinkResponse> {
    const methodName = "fetchPaymentLink";
    this.logger.log(`[${methodName}] Fetching payment link: ${paymentLinkId}`);

    if (!paymentLinkId) {
      this.logger.error(`[${methodName}] Payment Link ID is required`);
      throw new BadRequestException("Payment Link ID is required");
    }

    const url = `${this.baseUrl}/links/${paymentLinkId}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<CashfreeLinkResponse>(url, {
          headers: this.getAuthHeaders(),
        })
      );

      this.logger.log(`[${methodName}] Payment link fetched successfully`);
      this.logger.log(`[${methodName}] Status: ${data.link_status}`);
      this.logger.log(
        `[${methodName}] Amount Paid: ${data.link_amount_paid}, Amount: ${data.link_amount}`
      );

      return data;
    } catch (error) {
      this.logger.error(`[${methodName}] Failed to fetch payment link`);
      this.logger.error(`[${methodName}] Error: ${error.message}`);
      throw new InternalServerErrorException(
        "Failed to fetch payment link from Cashfree"
      );
    }
  }

  /**
   * Cancel a Payment Link
   */
  async cancelPaymentLink(paymentLinkId: string): Promise<boolean> {
    const methodName = "cancelPaymentLink";
    this.logger.log(
      `[${methodName}] Cancelling payment link: ${paymentLinkId}`
    );

    if (!paymentLinkId) {
      this.logger.error(`[${methodName}] Payment Link ID is required`);
      throw new BadRequestException("Payment Link ID is required");
    }

    const url = `${this.baseUrl}/links/${paymentLinkId}/cancel`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<CashfreeLinkResponse>(
          url,
          {},
          {
            headers: this.getAuthHeaders(),
          }
        )
      );

      this.logger.log(`[${methodName}] Payment link cancelled successfully`);
      this.logger.log(`[${methodName}] New status: ${data.link_status}`);

      return data.link_status === CashfreeLinkStatus.CANCELLED;
    } catch (error) {
      this.logger.error(`[${methodName}] Failed to cancel payment link`);
      this.logger.error(`[${methodName}] Error: ${error.message}`);
      throw new InternalServerErrorException("Failed to cancel payment link");
    }
  }

  /**
   * Get orders for a payment link
   */
  async getPaymentLinkOrders(
    paymentLinkId: string,
    status?: string
  ): Promise<CashfreeOrderResponse[]> {
    const methodName = "getPaymentLinkOrders";
    this.logger.log(
      `[${methodName}] Fetching orders for payment link: ${paymentLinkId}`
    );

    if (!paymentLinkId) {
      this.logger.error(`[${methodName}] Payment Link ID is required`);
      throw new BadRequestException("Payment Link ID is required");
    }

    const url = `${this.baseUrl}/links/${paymentLinkId}/orders`;

    const params: any = {};
    if (status) {
      params.status = status;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<CashfreeOrderResponse[]>(url, {
          headers: this.getAuthHeaders(),
          params,
        })
      );

      this.logger.log(
        `[${methodName}] Payment link orders fetched successfully`
      );
      this.logger.log(`[${methodName}] Number of orders: ${data.length}`);

      return data;
    } catch (error) {
      this.logger.error(`[${methodName}] Failed to fetch payment link orders`);
      this.logger.error(`[${methodName}] Error: ${error.message}`);
      throw new InternalServerErrorException(
        "Failed to fetch payment link orders from Cashfree"
      );
    }
  }

  /**
   * Verify webhook signature using raw body
   */
  verifyWebhookSignature(
    rawBody: string,
    signature: string,
    webhookSecret: string
  ): boolean {
    const methodName = "verifyWebhookSignature";
    this.logger.log(`[${methodName}] Verifying webhook signature`);

    try {
      // Cashfree signature is generated from the RAW POST body, not JSON.stringify(body)
      const generatedSignature = CryptoJS.HmacSHA256(
        rawBody,
        webhookSecret
      ).toString(CryptoJS.enc.Base64);

      const isValid = generatedSignature === signature;

      this.logger.log(
        `[${methodName}] Signature verification result: ${isValid}`
      );
      this.logger.log(`[${methodName}] Expected: ${generatedSignature}`);
      this.logger.log(`[${methodName}] Received: ${signature}`);

      return isValid;
    } catch (error) {
      this.logger.error(
        `[${methodName}] Error verifying webhook signature: ${error}`
      );
      return false;
    }
  }

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
    userId: string,
    web_hostname: string,
    formattedLoanId: string
  ): Promise<CashfreeCreateOrderResponse> {
    const methodName = "createOrder";

    try {
      // Validate provider
      await this.validateCashfreeProvider(transactionType);

      const url = `${this.baseUrl}/orders`;

      const body = {
        order_id: receiptId,
        order_currency: "INR",
        order_amount: amount,
        customer_details: {
          customer_id: formattedLoanId,
          customer_phone: customerPhone,
          customer_email: "",
          customer_name: customerName,
        },

        order_note: `Loan Repayment - Receipt: ${receiptId} - Loan ID: ${loanId} - PAN: ${panNumber} - Payment Request ID: ${paymentRequestId}`,

        order_tags: {
          pan: panNumber,
          loan_id: loanId,
          payment_request_id: paymentRequestId,
          payment_transaction_id: paymentTransactionId,
          transaction_type: transactionType,
        },

        order_expiry_time: this.getEndOfDayExpiry(),

        order_meta: {
          notify_url: process.env.CASHFREE_WEBHOOK_URL || "",
        },
      };

      const { data } = await firstValueFrom(
        this.httpService.post<any>(url, body, {
          headers: this.getAuthHeaders(),
        })
      );
      /**
       * ORDER → LINK-LIKE RESPONSE (BACKWARD COMPATIBLE)
       */
      return {
        status: true,
        // Orders API does NOT return a URL
        url: `https://${web_hostname}/payment/cashfree?session_id=${data.payment_session_id}`,
        // Use Cashfree order identifiers
        order_id: data.cf_order_id,
        payment_link_id: data.cf_order_id,
        amount: data.order_amount,
        currency: data.order_currency,
        reference_id: data.order_tags?.payment_request_id,
        description: data.order_note,
      };
    } catch (error) {
      this.logger.error(`[${methodName}] Failed to create Cashfree order`);
      this.logger.error(`[${methodName}] Error: ${error.message}`);
      this.logger.error(
        `[${methodName}] Response data: ${JSON.stringify(
          error?.response?.data,
          null,
          2
        )}`
      );
      this.logger.error(`[${methodName}] Status: ${error?.response?.status}`);

      throw new InternalServerErrorException(
        `Failed to create Cashfree order: ${
          error?.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Check if payment link has successful payments
   */
  async hasSuccessfulPayment(paymentLinkId: string): Promise<boolean> {
    const methodName = "hasSuccessfulPayment";
    this.logger.log(
      `[${methodName}] Checking for successful payments: ${paymentLinkId}`
    );

    try {
      const paymentLink = await this.fetchPaymentLink(paymentLinkId);
      const hasPayment =
        paymentLink.link_amount_paid > 0 &&
        (paymentLink.link_status === CashfreeLinkStatus.PAID ||
          paymentLink.link_status === CashfreeLinkStatus.PARTIALLY_PAID);

      this.logger.log(`[${methodName}] Has successful payment: ${hasPayment}`);
      this.logger.log(
        `[${methodName}] Amount Paid: ${paymentLink.link_amount_paid}, Status: ${paymentLink.link_status}`
      );

      return hasPayment;
    } catch (error) {
      this.logger.error(`[${methodName}] Failed to check payment status`);
      return false;
    }
  }

  /**
   * Process Cashfree webhook callback - MAIN ENTRY POINT WITH ENHANCED LOGGING
   */
  async handleWebhookCallback(
    webhookPayload: any
  ): Promise<CashfreeWebhookResponse> {
    const methodName = "handleWebhookCallback";

    this.logger.log(`[${methodName}] ===== STARTING WEBHOOK PROCESSING =====`);
    this.logger.log(`[${methodName}] Processing Cashfree webhook`);
    this.logger.log(`[${methodName}] Webhook type: ${webhookPayload.type}`);
    this.logger.log(
      `[${methodName}] Webhook version: ${webhookPayload.version}`
    );
    this.logger.log(`[${methodName}] Event time: ${webhookPayload.event_time}`);
    this.logger.log(
      `[${methodName}] Full webhook payload:`,
      JSON.stringify(webhookPayload, null, 2)
    );

    try {
      const { data, type, event_time } = webhookPayload;

      // Handle different webhook types
      switch (type) {
        case "PAYMENT_LINK_EVENT":
          this.logger.log(
            `[${methodName}] Routing to PAYMENT_LINK_EVENT handler`
          );
          return this.handlePaymentLinkEvent(data);

        case "PAYMENT_SUCCESS_WEBHOOK":
          this.logger.log(
            `[${methodName}] Routing to PAYMENT_SUCCESS_WEBHOOK handler`
          );
          return this.handlePaymentSuccessEvent(webhookPayload);

        case "PAYMENT_CHARGES_WEBHOOK":
          this.logger.log(
            `[${methodName}] Routing to PAYMENT_CHARGES_WEBHOOK handler`
          );
          return this.handlePaymentChargesEvent(webhookPayload);

        default:
          this.logger.warn(`[${methodName}] Unhandled webhook type: ${type}`);
          return {
            success: false,
            message: `Unsupported webhook type: ${type}`,
          };
      }
    } catch (error) {
      this.logger.error(
        `[${methodName}] ===== WEBHOOK PROCESSING FAILED =====`
      );
      this.logger.error(`[${methodName}] Error: ${error.message}`);
      this.logger.error(`[${methodName}] Stack: ${error.stack}`);
      this.logger.error(
        `[${methodName}] Webhook payload that caused error:`,
        JSON.stringify(webhookPayload, null, 2)
      );

      throw new InternalServerErrorException(
        "Failed to process webhook callback"
      );
    } finally {
      this.logger.log(
        `[${methodName}] ===== WEBHOOK PROCESSING COMPLETED =====`
      );
    }
  }

  /**
   * Handle PAYMENT_SUCCESS_WEBHOOK event - ENHANCED WITH MULTIPLE LOOKUP METHODS
   */
  private async handlePaymentSuccessEvent(
    webhookPayload: any
  ): Promise<CashfreeWebhookResponse> {
    const methodName = "handlePaymentSuccessEvent";
    this.logger.log(`[${methodName}] ===== PROCESSING PAYMENT SUCCESS =====`);

    try {
      // Extract data from webhook payload with proper structure handling
      const order = webhookPayload.data?.order || webhookPayload.order;
      const payment = webhookPayload.data?.payment || webhookPayload.payment;
      const cf_payment_id =
        payment?.cf_payment_id || webhookPayload.data?.payment?.cf_payment_id;
      if (!order) {
        this.logger.error(`[${methodName}] No order data found in webhook`);
        this.logger.error(
          `[${methodName}] Webhook structure:`,
          JSON.stringify(webhookPayload, null, 2)
        );
        throw new BadRequestException(
          "No order data in payment success webhook"
        );
      }

      const orderId = order.order_id;
      const paymentStatus = payment?.payment_status || order.payment_status;
      const orderAmount = order.order_amount;
      const orderTags = order.order_tags || {};

      this.logger.log(`[${methodName}] Order ID: ${orderId}`);
      this.logger.log(`[${methodName}] Payment Status: ${paymentStatus}`);
      this.logger.log(`[${methodName}] Order Amount: ${orderAmount}`);
      this.logger.log(
        `[${methodName}] Order Tags:`,
        JSON.stringify(orderTags, null, 2)
      );

      // METHOD 1: Lookup by payment_transaction_id from order_tags (PRIMARY METHOD)
      if (orderTags.payment_transaction_id) {
        this.logger.log(
          `[${methodName}] METHOD 1 - Using payment_transaction_id from order_tags`
        );
        const transactionId = orderTags.payment_transaction_id;
        const transactionType =
          orderTags.transaction_type as TransactionTypeEnum;

        this.logger.log(
          `[${methodName}] Found transaction ID: ${transactionId}, Type: ${transactionType}`
        );

        if (transactionType) {
          return this.updateTransactionFromNotes(
            transactionId,
            transactionType,
            paymentStatus,
            "PAYMENT_SUCCESS_PRIMARY",
            cf_payment_id
          );
        } else {
          this.logger.warn(
            `[${methodName}] No transaction_type found in order_tags`
          );
        }
      }

      // METHOD 2: Lookup by link_id from order_tags
      if (orderTags.link_id) {
        this.logger.log(
          `[${methodName}] METHOD 2 - Using link_id from order_tags: ${orderTags.link_id}`
        );
        const transaction = await this.findTransactionByLinkId(
          orderTags.link_id
        );
        if (transaction) {
          this.logger.log(
            `[${methodName}] Found transaction via link_id: ${transaction.id}`
          );
          return this.updateTransactionDirect(
            transaction.id,
            transaction.transactionType,
            paymentStatus,
            "PAYMENT_SUCCESS_LINK_ID"
          );
        }
      }

      // METHOD 3: Lookup by cf_link_id from order_tags
      if (orderTags.cf_link_id) {
        this.logger.log(
          `[${methodName}] METHOD 3 - Using cf_link_id from order_tags: ${orderTags.cf_link_id}`
        );
        const paymentLink = await this.findPaymentLinkByCfLinkId(
          orderTags.cf_link_id
        );
        if (paymentLink && paymentLink.link_notes) {
          const notes = paymentLink.link_notes;
          const transactionId = notes.payment_transaction_id;
          const transactionType = notes.transaction_type as TransactionTypeEnum;

          if (transactionId && transactionType) {
            this.logger.log(
              `[${methodName}] Found transaction via cf_link_id: ${transactionId}`
            );
            return this.updateTransactionFromNotes(
              transactionId,
              transactionType,
              paymentStatus,
              "PAYMENT_SUCCESS_CF_LINK_ID",
              cf_payment_id
            );
          }
        }
      }

      // METHOD 4: Lookup by order_id in externalRef field
      this.logger.log(
        `[${methodName}] METHOD 4 - Looking up by order_id in externalRef: ${orderId}`
      );
      const transaction = await this.findTransactionByExternalRef(orderId);
      if (transaction) {
        this.logger.log(
          `[${methodName}] Found transaction via externalRef: ${transaction.id}`
        );
        return this.updateTransactionDirect(
          transaction.id,
          transaction.transactionType,
          paymentStatus,
          "PAYMENT_SUCCESS_EXTERNAL_REF"
        );
      }

      // METHOD 5: Lookup by payment_request_id from order_tags
      if (orderTags.payment_request_id) {
        this.logger.log(
          `[${methodName}] METHOD 5 - Using payment_request_id from order_tags: ${orderTags.payment_request_id}`
        );
        const transaction = await this.findTransactionByPaymentRequestId(
          orderTags.payment_request_id
        );
        if (transaction) {
          this.logger.log(
            `[${methodName}] Found transaction via payment_request_id: ${transaction.id}`
          );
          return this.updateTransactionDirect(
            transaction.id,
            transaction.transactionType,
            paymentStatus,
            "PAYMENT_SUCCESS_REQUEST_ID"
          );
        }
      }

      // If all methods fail
      this.logger.error(
        `[${methodName}] ===== ALL TRANSACTION LOOKUP METHODS FAILED =====`
      );
      this.logger.error(`[${methodName}] Order ID: ${orderId}`);
      this.logger.error(
        `[${methodName}] Available order_tags:`,
        JSON.stringify(orderTags, null, 2)
      );
      this.logger.error(
        `[${methodName}] Full webhook payload:`,
        JSON.stringify(webhookPayload, null, 2)
      );

      throw new BadRequestException(
        `No transaction found for order ID: ${orderId}. ` +
          `Available lookup methods exhausted. Check webhook logs for details.`
      );
    } catch (error) {
      this.logger.error(
        `[${methodName}] ===== PAYMENT SUCCESS PROCESSING FAILED =====`
      );
      this.logger.error(`[${methodName}] Error: ${error.message}`);
      this.logger.error(`[${methodName}] Stack: ${error.stack}`);
      throw error;
    } finally {
      this.logger.log(
        `[${methodName}] ===== PAYMENT SUCCESS PROCESSING COMPLETED =====`
      );
    }
  }

  /**
   * Handle PAYMENT_LINK_EVENT
   */
  private async handlePaymentLinkEvent(
    data: any
  ): Promise<CashfreeWebhookResponse> {
    const methodName = "handlePaymentLinkEvent";
    this.logger.log(`[${methodName}] Processing payment link event`);

    const { link_id, link_status, link_amount_paid, link_notes } = data;

    this.logger.log(`[${methodName}] Payment Link ID: ${link_id}`);
    this.logger.log(`[${methodName}] Link Status: ${link_status}`);
    this.logger.log(`[${methodName}] Amount Paid: ${link_amount_paid}`);
    this.logger.log(
      `[${methodName}] Link Notes:`,
      JSON.stringify(link_notes, null, 2)
    );

    // Extract internal references from notes
    const paymentTransactionId = link_notes?.payment_transaction_id;
    const transactionType = link_notes?.transaction_type as TransactionTypeEnum;
    const loanId = link_notes?.loan_id;
    const paymentRequestId = link_notes?.payment_request_id;

    this.logger.log(
      `[${methodName}] Extracted details - Transaction ID: ${paymentTransactionId}, Type: ${transactionType}`
    );

    if (!paymentTransactionId || !transactionType) {
      this.logger.error(
        `[${methodName}] Missing required transaction details in webhook notes`
      );
      this.logger.error(
        `[${methodName}] Available notes:`,
        JSON.stringify(link_notes, null, 2)
      );
      throw new BadRequestException(
        "Missing required transaction details in webhook notes"
      );
    }

    return this.updateTransactionFromNotes(
      paymentTransactionId,
      transactionType,
      link_status,
      "PAYMENT_LINK"
    );
  }

  /**
   * Handle PAYMENT_CHARGES_WEBHOOK event
   */
  private async handlePaymentChargesEvent(
    webhookPayload: any
  ): Promise<CashfreeWebhookResponse> {
    const methodName = "handlePaymentChargesEvent";
    this.logger.log(
      `[${methodName}] ===== PROCESSING PAYMENT CHARGES WEBHOOK =====`
    );

    try {
      // Payment charges webhook contains fee and information
      const chargesDetails =
        webhookPayload.data?.charges_details || webhookPayload.charges_details;
      const order = webhookPayload.data?.order || webhookPayload.order;
      const payment = webhookPayload.data?.payment || webhookPayload.payment;

      this.logger.log(
        `[${methodName}] Charges Details:`,
        JSON.stringify(chargesDetails, null, 2)
      );
      this.logger.log(
        `[${methodName}] Order Details:`,
        JSON.stringify(order, null, 2)
      );
      this.logger.log(
        `[${methodName}] Payment Details:`,
        JSON.stringify(payment, null, 2)
      );

      if (!order) {
        this.logger.error(
          `[${methodName}] No order data found in charges webhook`
        );
        throw new BadRequestException(
          "No order data in payment charges webhook"
        );
      }

      const orderTags = order.order_tags || {};
      const paymentStatus =
        payment?.payment_status || order.payment_status || "SUCCESS";
      // Extract transaction details from order_tags
      const paymentTransactionId = orderTags.payment_transaction_id;
      const transactionType = orderTags.transaction_type as TransactionTypeEnum;
      const orderId = order.order_id;

      this.logger.log(
        `[${methodName}] Extracted transaction ID: ${paymentTransactionId}`
      );
      this.logger.log(
        `[${methodName}] Extracted transaction type: ${transactionType}`
      );
      this.logger.log(`[${methodName}] Order ID: ${orderId}`);

      // If we have transaction details in order_tags, update the transaction
      if (paymentTransactionId && transactionType) {
        this.logger.log(
          `[${methodName}] Found transaction details in order_tags, updating transaction`
        );
        return this.updateTransactionFromNotes(
          paymentTransactionId,
          transactionType,
          paymentStatus,
          "PAYMENT_CHARGES_WEBHOOK"
        );
      }

      // Otherwise, try to find transaction via other methods
      this.logger.log(
        `[${methodName}] No transaction details in order_tags, attempting alternative lookups`
      );

      // Try lookup by order_id
      const transaction = await this.findTransactionByExternalRef(orderId);
      if (transaction) {
        this.logger.log(
          `[${methodName}] Found transaction via order_id, updating`
        );
        return this.updateTransactionDirect(
          transaction.id,
          transaction.transactionType,
          paymentStatus,
          "PAYMENT_CHARGES_EXTERNAL_REF"
        );
      }

      this.logger.error(
        `[${methodName}] Could not find transaction for charges webhook`
      );
      this.logger.error(`[${methodName}] Order ID: ${orderId}`);
      this.logger.error(
        `[${methodName}] Available tags:`,
        JSON.stringify(orderTags, null, 2)
      );

      // Log the charges even if we couldn't update the transaction
      this.logger.warn(
        `[${methodName}] Processing charges without transaction update - may indicate missing transaction mapping`
      );

      return {
        success: true,
        message:
          "Payment charges webhook processed (transaction not found but charges logged)",
      };
    } catch (error) {
      this.logger.error(
        `[${methodName}] ===== PAYMENT CHARGES PROCESSING FAILED =====`
      );
      this.logger.error(`[${methodName}] Error: ${error.message}`);
      this.logger.error(`[${methodName}] Stack: ${error.stack}`);

      // Log the error but don't throw - charges webhook is informational
      this.logger.warn(
        `[${methodName}] Continuing despite charges webhook error`
      );

      return {
        success: false,
        message: `Payment charges processing failed: ${error.message}`,
      };
    } finally {
      this.logger.log(
        `[${methodName}] ===== PAYMENT CHARGES WEBHOOK PROCESSING COMPLETED =====`
      );
    }
  }

  /**
   * ENHANCED HELPER METHOD: Update transaction from notes with detailed logging
   */
  private async updateTransactionFromNotes(
    paymentTransactionId: string,
    transactionType: TransactionTypeEnum,
    status: string,
    source: string,
    externalRef?: string
  ): Promise<CashfreeWebhookResponse> {
    const methodName = "updateTransactionFromNotes";
    this.logger.log(`[${methodName}] ===== UPDATING TRANSACTION =====`);
    this.logger.log(`[${methodName}] Source: ${source}`);
    this.logger.log(`[${methodName}] Transaction ID: ${paymentTransactionId}`);
    this.logger.log(`[${methodName}] Transaction Type: ${transactionType}`);
    this.logger.log(`[${methodName}] Cashfree Status: ${status}`);

    try {
      let transactionStatus: TransactionStatusEnum;
      let failureReason: string | null = null;

      // Enhanced status mapping with detailed logging
      if (
        status === "SUCCESS" ||
        status === "PAID" ||
        status === CashfreeLinkStatus.PAID ||
        status === CashfreeLinkStatus.PARTIALLY_PAID
      ) {
        transactionStatus = TransactionStatusEnum.SUCCESS;
        this.logger.log(
          `[${methodName}] Mapping status ${status} to ${transactionStatus}`
        );
      } else if (
        status === "FAILED" ||
        status === CashfreeLinkStatus.CANCELLED
      ) {
        transactionStatus = TransactionStatusEnum.FAILED;
        failureReason = `Payment ${status.toLowerCase()}`;
        this.logger.log(
          `[${methodName}] Mapping status ${status} to ${transactionStatus}, Reason: ${failureReason}`
        );
      } else if (status === CashfreeLinkStatus.EXPIRED) {
        transactionStatus = TransactionStatusEnum.FAILED;
        failureReason = "Payment link expired";
        this.logger.log(
          `[${methodName}] Mapping status ${status} to ${transactionStatus}, Reason: ${failureReason}`
        );
      } else {
        transactionStatus = TransactionStatusEnum.PENDING;
        this.logger.log(
          `[${methodName}] Mapping status ${status} to ${transactionStatus}`
        );
      }

      this.logger.log(
        `[${methodName}] Final transaction status: ${transactionStatus}`
      );

      // Update transaction based on type with enhanced error handling
      if (transactionType === TransactionTypeEnum.COLLECTION) {
        this.logger.log(`[${methodName}] Updating COLLECTION transaction`);
        const transaction =
          await this.prisma.paymentCollectionTransaction.update({
            where: { id: paymentTransactionId },
            data: {
              status: transactionStatus,
              failureReason,
              completedAt:
                transactionStatus === TransactionStatusEnum.SUCCESS
                  ? new Date()
                  : null,
              externalRef: externalRef || undefined,
            },
            include: {
              paymentRequest: true,
            },
          });

        this.logger.log(
          `[${methodName}] Successfully updated COLLECTION transaction: ${transaction.id}`
        );

        // Also update the payment request if successful
        if (
          transactionStatus === TransactionStatusEnum.SUCCESS &&
          transaction.paymentRequest
        ) {
          await this.prisma.paymentRequest.update({
            where: { id: transaction.paymentRequest.id },
            data: { status: TransactionStatusEnum.SUCCESS },
          });
          this.logger.log(
            `[${methodName}] Updated payment request status to SUCCESS: ${transaction.paymentRequest.id}`
          );
        }
      } else if (transactionType === TransactionTypeEnum.PARTIAL_COLLECTION) {
        this.logger.log(
          `[${methodName}] Updating PARTIAL_COLLECTION transaction`
        );
        const updatedTransaction =
          await this.prisma.paymentPartialCollectionTransaction.update({
            where: { id: paymentTransactionId },
            data: {
              status: transactionStatus,
              failureReason,
              completedAt:
                transactionStatus === TransactionStatusEnum.SUCCESS
                  ? new Date()
                  : null,
              externalRef: externalRef || undefined,
            },
            include: {
              paymentRequest: true,
            },
          });

        this.logger.log(
          `[${methodName}] Successfully updated PARTIAL_COLLECTION transaction: ${updatedTransaction.id}`
        );
        this.logger.log(
          `[${methodName}] Is Payment Complete: ${updatedTransaction.isPaymentComplete}`
        );

        // Update payment request status if payment is complete
        if (
          updatedTransaction.isPaymentComplete &&
          transactionStatus === TransactionStatusEnum.SUCCESS &&
          updatedTransaction.paymentRequest
        ) {
          await this.prisma.paymentRequest.update({
            where: { id: updatedTransaction.paymentRequest.id },
            data: { status: TransactionStatusEnum.SUCCESS },
          });
          this.logger.log(
            `[${methodName}] Updated payment request status to SUCCESS: ${updatedTransaction.paymentRequest.id}`
          );
        }
      } else {
        throw new BadRequestException(
          `Unsupported transaction type: ${transactionType}`
        );
      }

      this.logger.log(
        `[${methodName}] ===== TRANSACTION UPDATE SUCCESSFUL =====`
      );

      return {
        success: true,
        transactionId: paymentTransactionId,
        status: transactionStatus,
        message: `Successfully updated ${transactionType} transaction status to ${transactionStatus}`,
      };
    } catch (error) {
      this.logger.error(
        `[${methodName}] ===== TRANSACTION UPDATE FAILED =====`
      );
      this.logger.error(
        `[${methodName}] Error updating transaction: ${error.message}`
      );
      this.logger.error(
        `[${methodName}] Transaction ID: ${paymentTransactionId}`
      );
      this.logger.error(`[${methodName}] Transaction Type: ${transactionType}`);
      throw error;
    }
  }

  /**
   * ENHANCED HELPER: Find transaction by link_id
   */
  private async findTransactionByLinkId(
    linkId: string
  ): Promise<{ id: string; transactionType: TransactionTypeEnum } | null> {
    const methodName = "findTransactionByLinkId";
    this.logger.log(
      `[${methodName}] Looking up transaction by link_id: ${linkId}`
    );

    try {
      // First try collection transactions by receiptId
      const collectionTransaction =
        await this.prisma.paymentCollectionTransaction.findFirst({
          where: {
            receiptId: linkId,
          },
        });

      if (collectionTransaction) {
        this.logger.log(
          `[${methodName}] Found COLLECTION transaction: ${collectionTransaction.id}`
        );
        return {
          id: collectionTransaction.id,
          transactionType: TransactionTypeEnum.COLLECTION,
        };
      }

      // Then try partial collection transactions by receiptId
      const partialTransaction =
        await this.prisma.paymentPartialCollectionTransaction.findFirst({
          where: {
            receiptId: linkId,
          },
        });

      if (partialTransaction) {
        this.logger.log(
          `[${methodName}] Found PARTIAL_COLLECTION transaction: ${partialTransaction.id}`
        );
        return {
          id: partialTransaction.id,
          transactionType: TransactionTypeEnum.PARTIAL_COLLECTION,
        };
      }

      this.logger.log(
        `[${methodName}] No transaction found for link_id: ${linkId}`
      );
      return null;
    } catch (error) {
      this.logger.error(
        `[${methodName}] Error finding transaction by link_id: ${error.message}`
      );
      return null;
    }
  }

  /**
   * ENHANCED HELPER: Find transaction by externalRef (order_id)
   */
  private async findTransactionByExternalRef(
    externalRef: string
  ): Promise<{ id: string; transactionType: TransactionTypeEnum } | null> {
    const methodName = "findTransactionByExternalRef";
    this.logger.log(
      `[${methodName}] Looking up transaction by externalRef: ${externalRef}`
    );

    try {
      // First try collection transactions
      const collectionTransaction =
        await this.prisma.paymentCollectionTransaction.findFirst({
          where: {
            externalRef: externalRef,
          },
        });

      if (collectionTransaction) {
        this.logger.log(
          `[${methodName}] Found COLLECTION transaction: ${collectionTransaction.id}`
        );
        return {
          id: collectionTransaction.id,
          transactionType: TransactionTypeEnum.COLLECTION,
        };
      }

      // Then try partial collection transactions
      const partialTransaction =
        await this.prisma.paymentPartialCollectionTransaction.findFirst({
          where: {
            externalRef: externalRef,
          },
        });

      if (partialTransaction) {
        this.logger.log(
          `[${methodName}] Found PARTIAL_COLLECTION transaction: ${partialTransaction.id}`
        );
        return {
          id: partialTransaction.id,
          transactionType: TransactionTypeEnum.PARTIAL_COLLECTION,
        };
      }

      this.logger.log(
        `[${methodName}] No transaction found for externalRef: ${externalRef}`
      );
      return null;
    } catch (error) {
      this.logger.error(
        `[${methodName}] Error finding transaction by externalRef: ${error.message}`
      );
      return null;
    }
  }

  /**
   * ENHANCED HELPER: Find transaction by payment_request_id
   */
  private async findTransactionByPaymentRequestId(
    paymentRequestId: string
  ): Promise<{ id: string; transactionType: TransactionTypeEnum } | null> {
    const methodName = "findTransactionByPaymentRequestId";
    this.logger.log(
      `[${methodName}] Looking up transaction by payment_request_id: ${paymentRequestId}`
    );

    try {
      // First try collection transactions
      const collectionTransaction =
        await this.prisma.paymentCollectionTransaction.findFirst({
          where: {
            paymentRequestId: paymentRequestId,
          },
        });

      if (collectionTransaction) {
        this.logger.log(
          `[${methodName}] Found COLLECTION transaction: ${collectionTransaction.id}`
        );
        return {
          id: collectionTransaction.id,
          transactionType: TransactionTypeEnum.COLLECTION,
        };
      }

      // Then try partial collection transactions
      const partialTransaction =
        await this.prisma.paymentPartialCollectionTransaction.findFirst({
          where: {
            paymentRequestId: paymentRequestId,
          },
        });

      if (partialTransaction) {
        this.logger.log(
          `[${methodName}] Found PARTIAL_COLLECTION transaction: ${partialTransaction.id}`
        );
        return {
          id: partialTransaction.id,
          transactionType: TransactionTypeEnum.PARTIAL_COLLECTION,
        };
      }

      this.logger.log(
        `[${methodName}] No transaction found for payment_request_id: ${paymentRequestId}`
      );
      return null;
    } catch (error) {
      this.logger.error(
        `[${methodName}] Error finding transaction by payment_request_id: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Find payment link by Cashfree link ID
   */
  private async findPaymentLinkByCfLinkId(
    cfLinkId: string
  ): Promise<CashfreePaymentLinkResponse | null> {
    const methodName = "findPaymentLinkByCfLinkId";
    this.logger.log(
      `[${methodName}] Finding payment link by CF link ID: ${cfLinkId}`
    );

    try {
      if (!cfLinkId) {
        this.logger.log(`[${methodName}] No cf_link_id provided`);
        return null;
      }

      return await this.fetchPaymentLink(cfLinkId);
    } catch (error) {
      this.logger.error(
        `[${methodName}] Error finding payment link: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Update transaction directly (without notes lookup)
   */
  private async updateTransactionDirect(
    transactionId: string,
    transactionType: TransactionTypeEnum,
    status: string,
    source: string
  ): Promise<CashfreeWebhookResponse> {
    const methodName = "updateTransactionDirect";
    this.logger.log(
      `[${methodName}] Updating transaction directly from ${source}`
    );
    this.logger.log(
      `[${methodName}] Transaction ID: ${transactionId}, Type: ${transactionType}, Status: ${status}`
    );

    // Reuse the same logic as updateTransactionFromNotes
    return this.updateTransactionFromNotes(
      transactionId,
      transactionType,
      status,
      source
    );
  }

  /**
   * Find payment link by order ID (legacy method - kept for compatibility)
   */
  private async findPaymentLinkByOrderId(
    orderId: string
  ): Promise<CashfreePaymentLinkResponse | null> {
    const methodName = "findPaymentLinkByOrderId";
    this.logger.log(
      `[${methodName}] Finding payment link for order: ${orderId}`
    );

    try {
      // This method is less reliable than the new lookup methods
      // Try to find transaction first, then get payment link from it
      const transaction = await this.findTransactionByExternalRef(orderId);
      if (transaction) {
        // If we found a transaction, we don't actually need the payment link
        // since we can update the transaction directly
        this.logger.log(
          `[${methodName}] Found transaction, no need for payment link lookup`
        );
        return null;
      }

      this.logger.log(
        `[${methodName}] No transaction found for order ID: ${orderId}`
      );
      return null;
    } catch (error) {
      this.logger.error(
        `[${methodName}] Failed to find payment link by order ID: ${error.message}`
      );
      return null;
    }
  }

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
   * Get end of day expiry time for same-day payment orders
   * Returns ISO string for end of current day (23:59:59)
   */
  private getEndOfDayExpiry(): string {
    const expiryTime = new Date();
    expiryTime.setHours(23, 59, 59, 999);
    return expiryTime.toISOString();
  }
}
