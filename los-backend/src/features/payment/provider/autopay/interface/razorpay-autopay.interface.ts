// src/razorpay/interfaces/razorpay.interface.ts
export interface RazorpayCustomer {
  id: string;
  entity: string;
  name: string;
  email: string;
  contact: string;
  gstin: string | null;
  notes: Record<string, any>;
  created_at: number;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id: string | null;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
  notification?: {
    token_id: string;
    payment_after: number;
    id?: string;
  };
}

export interface RazorpayPayment {
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
  customer_id: string;
  token_id: string;
  notes: Record<string, any>;
  fee: number;
  tax: number;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  acquirer_data: Record<string, any>;
  created_at: number;
}


export interface RecurringPaymentResponse {
  paymentId: string;
  status: string;
  note?: string;
  paymentRequestId: string;
}

export interface UpiTokenDetails {
  max_amount: number;
  expire_at: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurring_value: number;
  recurring_type: 'on' | 'before';
}

export interface NotificationDetails {
  token_id: string;
  payment_after: number;
}

export interface VpaDetails {
  username: string;
  handle: string;
  name: string | null;
}



// Add these interfaces to your existing file

export interface TokenStatus {
  tokenId: string;
  customerId: string;
  status: string;
  authorizationStatus?: string;
  vpa?: string;
  expireAt?: Date;
  lastUpdated?: Date;
  source: 'database' | 'razorpay';
}

export interface CancelTokenResponse {
  success: boolean;
  message: string;
  cancellationId?: string;
  timestamp: string;
}

export interface DeleteTokenResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

export interface TokenDetails {
  id: string;
  entity: string;
  token: string;
  bank: string | null;
  wallet: string | null;
  method: string;
  vpa: {
    username: string;
    handle: string;
    name: string | null;
  };
  recurring: boolean;
  recurring_details: {
    status: 'confirmed' | 'pending' | 'rejected' | 'cancelled';
    failure_reason: string | null;
  };
  auth_type: string | null;
  mrn: string | null;
  used_at: number;
  created_at: number;
  expired_at: number | null;
  dcc_enabled: boolean;
  dbStatus?: string;
  authorizationStatus?: string;
}



export interface RazorpayAuthorizationResponse {
  id: string;
  entity: string;
  receipt: string;
  invoice_number: string;
  customer_id: string;
  customer_details: CustomerDetails;
  order_id: string;
  line_items: LineItem[];
  payment_id: string | null;
  status: string;
  expire_by: number | null;
  issued_at: number;
  paid_at: number | null;
  cancelled_at: number | null;
  expired_at: number | null;
  sms_status: string;
  email_status: string;
  date: number;
  terms: string | null;
  partial_payment: boolean;
  gross_amount: number;
  tax_amount: number;
  taxable_amount: number;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  currency_symbol: string;
  description: string | null;
  notes: Record<string, string>;
  comment: string | null;
  short_url: string | null;
  view_less: boolean;
  billing_start: number | null;
  billing_end: number | null;
  type: string;
  group_taxes_discounts: boolean;
  created_at: number;
  idempotency_key: string | null;
}

export interface CustomerDetails {
  id: string;
  name: string;
  email: string;
  contact: string;
  gstin: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  customer_name: string;
  customer_email: string;
  customer_contact: string;
}

export interface LineItem {
  // Razorpay supports many fields; using minimal model since your array is empty.
  name?: string;
  amount?: number;
  currency?: string;
  quantity?: number;
  description?: string;
  discount?: number;
}
