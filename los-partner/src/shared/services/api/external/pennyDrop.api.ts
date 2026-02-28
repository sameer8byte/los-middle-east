import api from "../../axios";

export interface PennyDropRequest {
  accountNumber: string;
  ifsc: string;
  beneficiaryName?: string;
  userId?: string;
  userBankAccountId?: string;
}

export interface PennyDropResponse {
  success: boolean;
  nameMatch?: boolean;
  accountHolderName?: string;
  message?: string;
  provider: string;
  raw?: any;
}

/**
 * Verify bank account using configured primary provider
 */
export const verifyBankAccount = async (
  brandId: string,
  data: PennyDropRequest
): Promise<PennyDropResponse> => {
  const response = await api.post(
    `/partner/brand/${brandId}/penny-drop/verify`,
    data
  );
  return response.data;
};

/**
 * Verify bank account with automatic fallback to secondary provider
 */
export const verifyBankAccountWithFallback = async (
  brandId: string,
  data: PennyDropRequest
): Promise<PennyDropResponse> => {
  const response = await api.post(
    `/partner/brand/${brandId}/penny-drop/verify-with-fallback`,
    data
  );
  return response.data;
};

const pennyDropApi = {
  verifyBankAccount,
  verifyBankAccountWithFallback,
};

export default pennyDropApi;
