import { HttpService } from "@nestjs/axios";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import * as CryptoJS from "crypto-js";
import { platform_type, TransactionTypeEnum } from "@prisma/client";
export enum PaytringPaymentStatus {
  CREATED = "created", // Order created, payment link not opened
  INITIATED = "initiated", // Payment process started, link opened
  PENDING = "pending", // Awaiting confirmation or authorization
  SUCCESS = "success", // Payment completed successfully
  FAILED = "failed", // Payment attempt failed
  REFUNDED = "refunded", // Payment refunded to payer
}

interface Notes {
  udf1: string;
  udf2: string;
  udf3: string;
  udf4: string;
  udf5: string;
  udf6: string;
  udf8: string;
  udf9: string;
  udf10: string;
}

interface Address {
  firstname: string;
  lastname: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  notes: Notes;
  billing_address: Address;
  shipping_address: Address;
}

interface Order {
  order_id: string;
  receipt_id: string;
  pg_transaction_id: string;
  amount: number; // default: 0
  currency: string;
  pg: string;
  method: string;
  order_status: PaytringPaymentStatus;
  unmapped_status: string;
  customer: Customer;
}

export interface PaymentStatusResponse {
  status: boolean; // default: true
  order: Order;
  additional_charges: number; // default: 0
  mdr: string;
  tpv: string[]; // update if you know the type of TPV entries
  created_at: string;
  updated_at: string;
}

@Injectable()
export class PaytringService {
  constructor(private readonly httpService: HttpService) {}

  async createOrder(
    paymentRequestId: string,
    paymentTransactionId: string,
    amount: number,
    cname: string,
    phone: string,
    pan: string,
    loanId: string,
    receiptId: string,
    platformType: platform_type,
    transactionType: TransactionTypeEnum,
     userId: string,
    web_hostname: string
  ): Promise<{
    status: boolean;
    url: string;
    order_id: string;
  }> {
    const url = `${
      process.env.PAYTRING_BASE_URL || "https://api.paytring.com"
    }/api/v2/order/create`;
    const body: {
      key: string;
      amount: number;
      cname: string;
      phone: string;
      receipt_id: string;
      callback_url: string;
      currency?: string; // Optional, default to INR
      notes: {
        udf1: string; // PAN
        udf2: string; // Loan ID
        udf3: string; // Payment Request ID
        udf4: string; // Optional value
        udf5: platform_type; // Optional value
        udf6: TransactionTypeEnum; // Optional value
      };
      hash?: string; // Will be added later
    } = {
      key: process.env.PAYTRING_API_KEY || "your_paytring_key", // Ensure this is set in your environment
      amount: Number(amount * 100) || 0, // Ensure amount is a number and in paise
      cname,
      phone,
      receipt_id: receiptId,
      callback_url:
        process.env.PAYTRING_CALLBACK_URL||"",
      currency: "INR",
      /**
       * * Notes are used for additional information about the transaction.
       * * udf1: PAN (Primary Account Number)
       * * udf2: Loan ID
       * * udf3: Payment Request ID
       * * udf4: Payment Transaction ID
       * * udf5: platform_type (e.g., PARTNER)
       * * udf6: TransactionTypeEnum (e.g., COLLECTION)
       * * You can add more notes as needed.
       */
      notes: {
        udf1: pan,
        udf2: loanId,
        udf3: paymentRequestId,
        udf4: paymentTransactionId,
        udf5: platformType,
        udf6: transactionType,
      },
    };
    // Sort and hash the parameters
    let sorted_params = Object.keys(body)
      .sort()
      .reduce((acc, key) => {
        acc[key] = body[key];
        return acc;
      }, {});

    let value_string =
      Object.values(sorted_params)
        .filter((value) => typeof value !== "object")
        .join("|") + `|${process.env.PAYTRING_PROD_KEY}`;

    const hash = CryptoJS.SHA512(value_string).toString();
    body.hash = hash;
    // Make the API request to create the order
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Basic ${process.env.PAYTRING_API_TOKEN}`, // optional
          },
        })
      );
      return data;
    } catch (error) {
      console.error(
        "Error creating Paytring order:",
        error?.response?.data || error.message
      );
      throw new InternalServerErrorException(
        "Failed to create order with Paytring"
      );
    }
  }

  async fetchOrder(orderId: string) {
    if (!orderId) {
      throw new BadRequestException("Order ID and hash are required");
    }

    const url = `${
      process.env.PAYTRING_BASE_URL || "https://api.paytring.com"
    }/api/v2/order/fetch`;

    const payload: {
      key: string;
      id: string;
      hash?: string;
    } = {
      key: process.env.PAYTRING_API_KEY || "your_paytring_key", // Ensure this is set in your environment
      id: orderId,
    };

    // Sort and hash the parameters
    let sorted_params = Object.keys(payload)
      .sort()
      .reduce((acc, key) => {
        acc[key] = payload[key];
        return acc;
      }, {});

    let value_string =
      Object.values(sorted_params)
        .filter((value) => typeof value !== "object")
        .join("|") + `|${process.env.PAYTRING_API_KEY}`;

    const hash = CryptoJS.SHA512(value_string).toString();
    payload.hash = hash;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Basic ${process.env.PAYTRING_API_TOKEN}`, // optional
          },
        })
      );
      if (!data || !data.status) {
        throw new InternalServerErrorException(
          "Failed to fetch order from Paytring"
        );
      }
      return data;
    } catch (error) {
      console.error(
        "Error fetching Paytring order:",
        error?.response?.data || error.message
      );
      throw new InternalServerErrorException(
        "Failed to fetch order from Paytring"
      );
    }
  }
}
