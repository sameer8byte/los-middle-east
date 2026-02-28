
export interface UserBankAccount {
    id?: string;
    userId?: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    bankAddress: string;
    accountType: string;
    verificationMethod?: user_bank_verification_method;
    verificationStatus?: user_bank_verification_status;
  }
  
  
  export enum user_bank_verification_method {
    PENNY_DROP = "PENNY_DROP",
  }
  
  export enum user_bank_verification_status {
    PENDING = "PENDING",
    VERIFIED = "VERIFIED",
    FAILED = "FAILED",
    RETRYING = "RETRYING"
  }
  