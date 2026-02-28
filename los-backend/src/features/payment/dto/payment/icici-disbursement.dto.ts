import { BankTransferResponse } from "../../provider/icici.disbursement.service";
import { TransferTypeEnum } from "./idfc-disbursement.dto";

export enum ICICITransferTypeEnum {
  IMPS = "IMPS",
  NEFT = "NEFT",
}

export enum ICICIPriorityEnum {
  IMPS = "0100",
  NEFT = "0010",
  IMPS_NEFT_FALLBACK = "0120", // IMPS first, NEFT fallback
}

export interface ICICIFundTransferRequest {
  // Common parameters
  amount: string;
  remarks: string;
  // Payment mode
  transferType: TransferTypeEnum;
  formattedLoanId: string;
  priority: ICICIPriorityEnum;

  // Beneficiary details
  beneAccNo: string;
  beneIFSC: string;
  beneName: string;

  // Transaction reference
  tranRefNo: string;
  localTxnDtTime?: string;

  // CIB parameters
  crpId: string;
  crpUsr: string;
  aggrId: string;
  aggrName: string;
  urn: string;

  // IMPS specific
  passCode?: string;
  bcID?: string;
  retailerCode?: string;

  // NEFT specific
  narration1?: string;
  narration2?: string;
  txnType?: string; // "RGS" or "TPA"
  workflowReqd?: string; // "Y" or "N"

  // Sender details
  senderAcctNo?: string;
  senderName?: string;

  // Device info
  mobile?: string;
}

export interface ICICIStatusCheckRequest {
  originalSeqNo: string;
  date: string; // MM/DD/YYYY
  recon360: string; // "Y" or "N"
  priority: ICICIPriorityEnum;

  // For IMPS
  transRefNo?: string;
  passCode?: string;
  bcID?: string;

  // For NEFT
  uniqueId?: string;
  utrNumber?: string;
}

export interface ICICIFundTransferResponse {
  success: boolean;
  status: string;
  transactionId: string;
  referenceNumber: string;
  message: string;
  errorCode?: string;
  responseCode?: string;
  data: BankTransferResponse;
}

export interface ICICIStatusCheckResponse {
  success: boolean;
  status: string;
  originalTransactionStatus?: string;
  currentTransactionStatus?: string;
  bankRRN?: string;
  utrNumber?: string;
  reqId?: string;
  message?: string;
  errorCode?: string;
  data?: any;
}

export interface IPaymentProvider {
  initiateTransfer(
    request: ICICIFundTransferRequest,
    correlationId: string,
  ): Promise<ICICIFundTransferResponse>;

  checkStatus(
    request: ICICIStatusCheckRequest,
    correlationId: string,
  ): Promise<ICICIStatusCheckResponse>;
}
