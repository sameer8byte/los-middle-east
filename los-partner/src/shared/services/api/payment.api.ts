import { PaymentMethodEnum } from "../../../constant/enum";
import api from "../axios";

export const disburseLoanRequest = async (loanId: string) => {
  try {
    const response = await api.post(`/payment/disburse-loan-request`, {
      loanId,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating disburse loan request:", error);
    throw error;
  }
};

export const disburseTransaction = async (
  paymentRequestId: string,
  loanId: string,
  provider: PaymentMethodEnum,
  externalRef: string,
  disbursementDate: string | null = null,
  brandBankAccountId: string | null = null,
  confirmPassword: string | null = null,
  transferType?: string
) => {
  try {
    const response = await api.post(`/payment/disburse-transaction`, {
      paymentRequestId,
      loanId,
      method: provider,
      externalRef,
      disbursementDate: disbursementDate || null,
      brandBankAccountId,
      confirmPassword,
      transferType,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating disbursement transaction:", error);
    throw error;
  }
};

// manual-payment
export const manualPayment = async (formData: FormData) => {
  try {
    const response = await api.post(`/payment/manual-payment`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating manual payment:", error);
    throw error;
  }
};

export const manualPartialPayment = async (formData: FormData) => {
  try {
    const response = await api.post(
      `/payment/manual-partial-payment`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating manual partial payment:", error);
    throw error;
  }
};

// updateOpsApprovalStatus
export const updateOpsApprovalStatus = async (
  paymentRequestId: string,
  paymentCollectionTransactionId: string | null,
  paymentPartialCollectionTransactionId: string | null,
  opsApprovalStatus: string,
  reason?: string,
  closingType?: string
) => {
  try {
    const response = await api.patch(`/payment/ops-approval-status`, {
      paymentRequestId,
      paymentCollectionTransactionId,
      paymentPartialCollectionTransactionId,
      opsApprovalStatus,
      reason,
      closingType,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating ops approval status:", error);
    throw error;
  }
};

export const getPaymentRequestByLoanId = async (loanId: string) => {
  try {
    const response = await api.get(`/payment/get-payment-request/${loanId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching payment request by loan ID:", error);
    throw error;
  }
};

// Bulk Disbursement Types
export interface BulkDisbursementItem {
  formattedLoanId: string;
  method: PaymentMethodEnum;
  externalRef: string;
  brandBankAccountId: string;
  disbursementDate?: string | null;
}

export interface BulkDisbursementResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: {
    formattedLoanId: string;
    success: boolean;
    error?: string;
  }[];
}

// Bulk disbursement - JSON payload
export const bulkDisbursement = async (
  disbursements: BulkDisbursementItem[]
): Promise<BulkDisbursementResult> => {
  try {
    const response = await api.post(`/payment/bulk-disburse`, {
      disbursements,
    });
    return response.data;
  } catch (error) {
    console.error("Error processing bulk disbursement:", error);
    throw error;
  }
};

// Bulk disbursement - CSV upload
export const bulkDisbursementFromCsv = async (
  file: File
): Promise<BulkDisbursementResult> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(`/payment/bulk-disburse-csv`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error processing bulk disbursement from CSV:", error);
    throw error;
  }
};


export const createRazorpayRecurringPayment = async (paymentData: {
  userId: string;
  loanId: string;
  dueDate: string;
  description?: string;
}) => {
  try {
    const response = await api.post(`/payment/recurring-payment`, paymentData);
    return response.data;
  } catch (error) {
    console.error("Error creating Razorpay recurring payment:", error);
    throw error;
  }
};

interface PaymentApprovalFilters {
  brandId: string;
  limit?: number;
  offset?: number;
  transactionType?: "all" | "collection" | "partial_collection";
  search?: string;
}

/**
 * Highly Optimized: Fetch pending ops approval transactions
 * Uses field-specific select to minimize payload size
 * Supports pagination for efficient data loading
 */
export const getPendingOpsApprovalTransactions = async (
  filters: PaymentApprovalFilters
) => {
  try {
    // Validate and normalize transaction type
    const validTypes = ["all", "collection", "partial_collection"];
    const transactionType = validTypes.includes(filters.transactionType || "all") 
      ? (filters.transactionType || "all") 
      : "all";

    const response = await api.get('/payment/pending-ops-approval', {
      params: {
        brandId: filters.brandId,
        limit: Math.min(filters.limit || 10, 100), // Cap at 100
        offset: Math.max(filters.offset || 0, 0),
        transactionType,
        ...(filters.search && { search: filters.search }),
      },
    });

    // Return the response data with proper structure
    return response.data;
  } catch (error) {
    console.error('Error fetching pending ops approval transactions:', error);
    throw error;
  }
};

interface DisbursementFilters {
  brandId: string;
  limit?: number;
  offset?: number;
  loanId?: string;
  search?: string;
}

/**
 * Fetch pending disbursement transactions
 * 
 * Automatically filters for:
 * - Loans with APPROVED status
 * - Loans with SIGNED agreements
 * - Payment requests of type DISBURSEMENT with status NOT SUCCESS
 */
export const getPendingDisbursementTransactions = async (
  filters: DisbursementFilters
) => {
  try {
    const response = await api.get('/payment/pending-disbursement', {
      params: {
        brandId: filters.brandId,
        limit: filters.limit || 10,
        offset: filters.offset || 0,
        ...(filters.loanId && { loanId: filters.loanId }),
        ...(filters.search && { search: filters.search }),
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching pending disbursement transactions:', error);
    throw error;
  }
};


// Add this to your payment.api.ts file
export const createRecurringPayment = async (data: {
  loanId: string;
  amount: number;
  description?: string;
}) => {
  const response = await api.post(
    `/payment-autopay/recurring-payment`,
    data,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

// Add this to your payment.api.ts file
export const checkAutopayEligibility = async (data: {
  userId: string;
  loanId: string;
}) => {
  try {
    const response = await api.post(
      `/payment-autopay/check-eligibility`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    // Handle 404 specifically (not eligible)
    if (error.response?.status === 404) {
      return { eligible: false, message: error.response.data?.message || "User not eligible for autopay" };
    }
    throw error;
  }
};

/**
 * Highly Optimized: Fetch rejected ops approval transactions
 * Uses field-specific select to minimize payload size
 * Supports pagination for efficient data loading
 */
export const getRejectedOpsApprovalTransactions = async (
  filters: PaymentApprovalFilters
) => {
  try {
    // Validate and normalize transaction type
    const validTypes = ["all", "collection", "partial_collection"];
    const transactionType = validTypes.includes(filters.transactionType || "all") 
      ? (filters.transactionType || "all") 
      : "all";

    const response = await api.get('/payment/rejected-ops-approval', {
      params: {
        brandId: filters.brandId,
        limit: Math.min(filters.limit || 10, 100), // Cap at 100
        offset: Math.max(filters.offset || 0, 0),
        transactionType,
        ...(filters.search && { search: filters.search }),
      },
    });

    // Return the response data with proper structure
    return response.data;
  } catch (error) {
    console.error('Error fetching rejected ops approval transactions:', error);
    throw error;
  }
};

/**
 * Highly Optimized: Fetch approved ops approval transactions
 * Uses field-specific select to minimize payload size
 * Supports pagination for efficient data loading
 */
export const getPaymentOpsApprovedTransactions = async (
  filters: PaymentApprovalFilters
) => {
  try {
    // Validate and normalize transaction type
    const validTypes = ["all", "collection", "partial_collection"];
    const transactionType = validTypes.includes(filters.transactionType || "all") 
      ? (filters.transactionType || "all") 
      : "all";

    const response = await api.get('/payment/payment-ops-approved', {
      params: {
        brandId: filters.brandId,
        limit: Math.min(filters.limit || 10, 100), // Cap at 100
        offset: Math.max(filters.offset || 0, 0),
        transactionType,
        ...(filters.search && { search: filters.search }),
      },
    });

    // Return the response data with proper structure
    return response.data;
  } catch (error) {
    console.error('Error fetching approved ops approval transactions:', error);
    throw error;
  }
};