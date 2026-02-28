export enum AAConsentStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  REJECTED = "REJECTED",
  PAUSED = "PAUSED",
  REVOKED = "REVOKED",
  EXPIRED = "EXPIRED",
}

export enum AADataStatus {
  PENDING = "PENDING",
  RECEIVED = "RECEIVED",
  PROCESSED = "PROCESSED",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
}

export interface AADataSession {
  id: string;
  consentRequestId: string;
  clientTransactionId: string;
  txnId?: string;
  fipId: string;
  fipName?: string;
  maskedAccountNumber?: string;
  accRefNumber?: string;
  dataType: string;
  encryptionEnabled: boolean;
  status: AADataStatus;
  rawData?: any;
  pdfData?: string;
  jsonData?: any;
  xmlData?: string;
  csvData?: string;
  filePrivateKey?: string;
  accountDetails?: any;
  transactionSummary?: any;
  balanceInfo?: any;
  createdAt: string;
  updatedAt: string;
  receivedAt?: string;
  processedAt?: string;
  errorMessage?: string;
  retryCount: number;
}

export interface AAConsentRequest {
  id: string;
  userId: string;
  brandId?: string;
  clientTransactionId: string;
  aaCustomerHandleId: string;
  aaCustomerMobile: string;
  consentHandle?: string;
  redirectionUrl?: string;
  consentStatus: AAConsentStatus;
  consentId?: string;
  useCaseId: string;
  sessionId?: string;
  txnId?: string;
  purpose?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  revokedAt?: string;
  aa_data_sessions?: AADataSession[];
  retryCount: number;
}

export interface AAConsentRequestState {
  consentRequests: AAConsentRequest[];
  currentConsentRequest?: AAConsentRequest;
  loading: boolean;
  error?: string;
}
