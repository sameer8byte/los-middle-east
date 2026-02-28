export interface PennyDropRequest {
  accountNumber: string;
  ifsc: string;
  beneficiaryName?: string;
  beneficiaryMobile?: string;
  // email: string; 
}

export interface PennyDropResponse {
  success: boolean;
  nameMatch?: boolean;
  accountHolderName?: string;
  message?: string;
  provider: string;
  raw?: any;
}

// Digitap specific interfaces
export interface DigitapPennyDropRequest {
  ifsc: string;
  accNo: string;
  benificiaryName?: string;
}

export interface DigitapPennyDropResponse {
  code: string;
  model: {
    status: string;
    clientRefNum: string;
    transactionId: string;
    paymentMode: string;
    rrn: string;
    beneficiaryName: string;
    isNameMatch: boolean;
    matchingScore: number;
  };
}

// ScoreMe specific interfaces
export interface ScoreMePennyDropRequest {
  accountNumber: string;
  ifsc: string;
}

export interface ScoreMePennyDropResponse {
  data: {
    utr: string;
    city: string;
    name: string;
    micr: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
  };
  referenceId: string;
  responseMessage: string;
  responseCode: string;
}


export interface SignzyPennyDropRequest {
  beneficiaryAccount: string;
  beneficiaryIFSC: string;
  beneficiaryMobile?: string;
  beneficiaryName?: string;
  nameMatchScore?: string;
  nameFuzzy?: boolean;
  email: string;
}

export interface SignzyPennyDropResponse {
  result?: {
    active: string;
    reason: string;
    nameMatch: string;
    mobileMatch: string;
    signzyReferenceId: string;
    auditTrail: {
      nature: string;
      value: string;
      timestamp: string;
    };
    ifscCodeData?: {
      status: string;
      bankName?: string;
      address?: string;
      state?: string;
      district?: string;
      branch?: string;
      contact?: string;
      ifscCode?: string;
      micrCode?: string;
      message?: string;
    };
    nameMatchScore?: string | number;
    bankTransfer?: {
      response: string;
      bankRRN: string;
      beneName: string;
      beneMMID: string;
      beneMobile: string;
      beneIFSC: string;
    };
  };
  error?: {
    reason: string;
    status: number;
    message: string;
    type: string;
    statusCode: number;
    name: string;
  };
}