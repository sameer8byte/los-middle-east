export interface FundTransferRequest {
  amount: string;
  beneficiaryAccount: string;
  beneficiaryName: string;
  beneficiaryIFSC: string;
  remarks?: string;
  // Add these new fields for IDFC
  beneficiaryAddress: string;
  emailId: string;
  mobileNo?: string;
}

export interface FundTransferResponse {
  data: any;
  success: boolean;
  status: string;
  transactionId?: string;
  referenceNumber?: string;
  message?: string;
  errorCode?: string;
}

export interface TransactionStatusRequest {
  transactionId: string;
  referenceNumber: string;
  utrNumber?: string;
  correlationId: string;
}

export interface TransactionStatusResponse {
  success: boolean;
  status: string;
  respCode?: string;
  status1?: string;
  utrNumber?: string;
  errorMessage?: string;
  errorCode?: string;
}

export type TransferType = "IMPS" | "NEFT";
export enum TransferTypeEnum {
  IMPS = "IMPS",
  NEFT = "NEFT",
}

export interface IPaymentProvider {
  initiateTransfer(request: FundTransferRequest, correlationId: string,
    transactionType:TransferType
  ): Promise<FundTransferResponse>;
  // checkStatus(request: TransactionStatusRequest): Promise<TransactionStatusResponse>;
  validateBeneficiary(accountNumber: string, ifscCode: string, correlationId: string): Promise<any>;
  getBalance(correlationId: string): Promise<any>;
}

export interface FundTransferRequest {
  amount: string;
  beneficiaryAccount: string;
  beneficiaryName: string;
  beneficiaryIFSC: string;
   // Add these new fields for IDFC
  beneficiaryAddress: string;
  emailId: string;
  remarks?: string;
 
  mobileNo?: string;
  partnerUserId: string;
}

export interface InitiateDisbursalDto {
  paymentRequestId: string;
  loanId: string;
  provider: string;
  externalRef?: string;
  disbursementDate?: Date;
  brandBankAccountId?: string;
}

export interface CheckStatusDto {
  disbursalTransactionId: string;
  provider?: string;
}