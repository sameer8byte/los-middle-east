import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { lastValueFrom } from "rxjs";
import * as crypto from "node:crypto";
import { CreateAuthorizationDto } from "./dto/create-authorization.dto";
import { CreateRecurringPaymentDto } from "./dto/create-recurring-payment.dto";
import {
  RazorpayAuthorizationResponse,
  RazorpayOrder,
  RazorpayPayment,
  RecurringPaymentResponse,
} from "./interface/razorpay-autopay.interface";

@Injectable()
export class RazorpayAutoPayService {
  private readonly logger = new Logger(RazorpayAutoPayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = "https://api.razorpay.com/v1";

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.keyId = this.configService.get<string>("RAZORPAY_KEY_ID");
    this.keySecret = this.configService.get<string>("RAZORPAY_KEY_SECRET");
    this.webhookSecret = this.configService.get<string>(
      "RAZORPAY_WEBHOOK_SECRET"
    );
  }

  private getAuthHeader() {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString(
      "base64"
    );
    return {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    };
  }

  async createAuthorization(
    createAuthDto: CreateAuthorizationDto
  ): Promise<RazorpayAuthorizationResponse | null> {
    try {
      const normalizedContact = createAuthDto.contact?.replace(
        /^(\+91|91)/,
        ""
      );

      const expireAt = Math.floor(
        new Date(createAuthDto.expireAt).getTime() / 1000
      );

      const payload = {
        customer: {
          name: createAuthDto.name,
          email: createAuthDto.email,
          contact: normalizedContact,
        },
        type: "link",
        amount: 100,
        currency: "INR",
        description: `UPI Mandate Authorization for Loan ID: ${createAuthDto.loanId}`,
        subscription_registration: {
          method: "upi",
          max_amount: createAuthDto.maxAmount * 100,
          expire_at: expireAt,
          frequency: "monthly",
        },
        email_notify: true,
        sms_notify: true,
        notes: {
          loan_id: createAuthDto.loanId,
          user_id: createAuthDto.userId,
          purpose: "loan_repayment_upi_mandate",
          brand_id: createAuthDto.brandId,
          payment_autopay_transaction_id:
            createAuthDto.paymentAutopayTransactionId,
          payment_request_id: createAuthDto.paymentRequestId
        },
      };
      const res = await lastValueFrom(
        this.httpService.post<RazorpayAuthorizationResponse>(
          `${this.baseUrl}/subscription_registration/auth_links`,
          payload,
          { headers: this.getAuthHeader() }
        )
      );
      return res.data;
    } catch (error) {
      this.logger.error(
        `UPI Authorization creation failed: ${error.response?.data?.error?.description || error.message}`,
        error.response?.data
      );
      throw error;
    }
  }
  async createOrder(createOrderDto: any): Promise<RazorpayOrder> {
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.baseUrl}/orders`, createOrderDto, {
          headers: this.getAuthHeader(),
        })
      );

      this.logger.log(`Created Razorpay order: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        "Failed to create Razorpay order",
        error.response?.data
      );
      throw new Error(
        `Order creation failed: ${error.response?.data?.error?.description}`
      );
    }
  }

  async createRecurringPayment(
    createPaymentDto: CreateRecurringPaymentDto
  ): Promise<RecurringPaymentResponse> {
    try {
      // Generate shorter receipt
      const timestamp = Date.now().toString().slice(-8);
      const receipt = `rec_${timestamp}`.slice(0, 40);

      // Create order for recurring payment
      const orderPayload = {
        amount: createPaymentDto.amount * 100, // Convert to paise
        currency: "INR",
        payment_capture: true,
        receipt: receipt,
        notes: {
          loan_id: createPaymentDto.loanId,
          user_id: createPaymentDto.userId,
          payment_request_id: createPaymentDto.paymentRequestId,
          purpose: "loan_repayment",
        },
      };

      this.logger.log(
        `Creating recurring order with amount: ${createPaymentDto.amount}`
      );

      const order = await this.createOrder(orderPayload);

      // Create recurring payment using token and customer from DTO
      const paymentPayload = {
        email: createPaymentDto.email || "",
        contact: createPaymentDto.contact || "",
        amount: createPaymentDto.amount * 100,
        currency: "INR",
        order_id: order.id,
        customer_id: createPaymentDto.customerId || "",
        token: createPaymentDto.tokenId || "",
        recurring: "1",
        description:
          createPaymentDto.description ||
          `Loan repayment (Amount: ₹${createPaymentDto.amount})`,
        notes: {
          loan_id: createPaymentDto.loanId,
          payment_type: "recurring_upi",
          amount: createPaymentDto.amount,
        },
      };

      this.logger.log(
        `Creating recurring payment for amount: ₹${createPaymentDto.amount}`
      );

      const paymentResponse = await lastValueFrom(
        this.httpService.post(
          `${this.baseUrl}/payments/create/recurring`,
          paymentPayload,
          { headers: this.getAuthHeader() }
        )
      );
      const paymentId = paymentResponse.data.razorpay_payment_id;

      this.logger.log(
        `UPI Recurring payment initiated: ${paymentId} for amount: ₹${createPaymentDto.amount}`
      );

      return paymentResponse.data;
    } catch (error) {
      this.logger.error("UPI Recurring payment creation failed", error);
      throw error;
    }
  }

  async handleWebhook(payload: any, signature: string) {
    try {
      // Verify webhook signature
      const isValid = this.verifyWebhookSignature(
        JSON.stringify(payload),
        signature
      );

      if (!isValid) {
        throw new Error("Invalid webhook signature");
      }

      // Process webhook event
      await this.processWebhookEvent(payload);

      this.logger.log(`Webhook processed successfully: ${payload.event}`);
    } catch (error) {
      this.logger.error("Webhook processing failed", error);
      throw error;
    }
  }

  private async processWebhookEvent(payload: any) {
    const { event, payload: eventPayload } = payload;

    switch (event) {
      case "payment.captured":
        await this.handlePaymentCaptured(eventPayload.payment.entity);
        break;

      case "payment.failed":
        await this.handlePaymentFailed(eventPayload.payment.entity);
        break;

      case "payment.authorized":
        await this.handlePaymentAuthorized(eventPayload.payment.entity);
        break;

      case "subscription.charged":
        await this.handleSubscriptionCharged(eventPayload.subscription.entity);
        break;

      case "token.confirmed":
        await this.handleTokenConfirmed(eventPayload.token.entity);
        break;

      default:
        this.logger.log(`Unhandled webhook event: ${event}`);
    }
  }

  private async handlePaymentCaptured(payment: RazorpayPayment) {
    this.logger.log(`UPI Payment captured: ${payment.id}`);
  }

  private async handlePaymentFailed(payment: RazorpayPayment) {
    this.logger.warn(
      `UPI Payment failed: ${payment.id} - ${payment.error_description}`
    );
  }

  private async handlePaymentAuthorized(payment: RazorpayPayment) {
    this.logger.log(
      `UPI Authorization completed with token: ${payment.token_id}, VPA: ${payment.vpa}`
    );
  }

  private async handleTokenConfirmed(token: any) {
    this.logger.log(
      `UPI Token confirmed: ${token.id}, VPA: ${token.vpa?.username}`
    );
  }

  private async handleSubscriptionCharged(subscription: any) {
    this.logger.log(`Subscription charged: ${subscription.id}`);
  }

  // Existing utility methods
  private async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/payments/${paymentId}`, {
          headers: this.getAuthHeader(),
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error("Failed to fetch payment", error.response?.data);
      throw error;
    }
  }

  private verifySignature(orderId: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret)
      .update(orderId)
      .digest("hex");

    return expectedSignature === signature;
  }

  private verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(payload)
      .digest("hex");

    return expectedSignature === signature;
  }

  async getDuePayments(): Promise<any[]> {
    this.logger.log("Fetching due payments");
    return [];
  }

  async getAuthorizationStatus(authorizationId: string) {
    this.logger.log(`Fetching authorization status for: ${authorizationId}`);
    return null;
  }

  async fetchCustomerTokens(customerId: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/customers/${customerId}/tokens`, {
          headers: this.getAuthHeader(),
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        "Failed to fetch customer tokens",
        error.response?.data
      );
      throw error;
    }
  }

  async deleteToken(customerId: string, tokenId: string): Promise<boolean> {
    try {
      const response = await lastValueFrom(
        this.httpService.delete(
          `${this.baseUrl}/customers/${customerId}/tokens/${tokenId}`,
          { headers: this.getAuthHeader() }
        )
      );

      this.logger.log(`Token deleted successfully: ${tokenId}`);
      return response.data.deleted;
    } catch (error) {
      this.logger.error("Failed to delete token", error.response?.data);
      throw new Error(
        `Token deletion failed: ${error.response?.data?.error?.description}`
      );
    }
  }

  async cancelToken(customerId: string, tokenId: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.httpService.put(
          `${this.baseUrl}/customers/${customerId}/tokens/${tokenId}/cancel`,
          {}, // Empty body for cancel request
          { headers: this.getAuthHeader() }
        )
      );

      this.logger.log(`Token cancellation initiated with NPCI: ${tokenId}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        "Failed to cancel token with NPCI",
        error.response?.data
      );
      throw new Error(
        `Token cancellation failed: ${error.response?.data?.error?.description}`
      );
    }
  }

  async getTokenStatus(customerId: string, tokenId: string): Promise<any> {
    try {
      // Fetch from Razorpay
      const tokens = await this.fetchCustomerTokens(customerId);
      const token = tokens.items.find((item: any) => item.id === tokenId);

      if (token) {
        return {
          tokenId,
          customerId,
          status: token.recurring_details?.status || "unknown",
          method: token.method,
          vpa: token.vpa,
          created_at: token.created_at,
          used_at: token.used_at,
          source: "razorpay",
        };
      }

      throw new Error("Token not found");
    } catch (error) {
      this.logger.error("Failed to get token status", error.response?.data);
      throw error;
    }
  }

  async getTokenDetails(tokenId: string) {
    this.logger.log(`Token ${tokenId} details requested`);
    return null;
  }
}
