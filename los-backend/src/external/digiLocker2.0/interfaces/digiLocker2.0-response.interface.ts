/**
 * Response from Signzy DigiLocker Create URL API
 */
export interface SignzyDigiLockerCreateUrlResponse {
  id: string;
  url: string;
  createdAt: string;
  expiresAt?: string;
  status?: string;
  message?: string;
}

/**
 * Response from Digitap KYC Unified Generate URL API
 */
export interface DigitapKycUnifiedGenerateUrlResponse {
  request_id?: string;
  result?: {
    url?: string;
    uniqueId?: string;
    expiryTime?: string;
  };
  status_code?: number;
  message?: string;
  success?: boolean;
}

/**
 * Callback data from DigiLocker
 */
export interface DigiLockerCallbackData {
  id: string;
  status: 'success' | 'failure' | 'pending';
  internalId: string;
  documents?: DigiLockerDocument[];
  error?: string;
  timestamp?: string;
}

/**
 * DigiLocker Document Structure
 */
export interface DigiLockerDocument {
  docType: string;
  docName: string;
  docData: any;
  uri?: string;
  issuedDate?: string;
}

/**
 * Unified DigiLocker Response
 */
export interface DigiLockerUnifiedResponse {
  success: boolean;
  message: string;
  url?: string;
  id?: string;
  uniqueId?: string;
  expiresAt?: string;
  documents?: DigiLockerDocument[];
  provider: "SIGNZY" | "DIGITAP";
  raw: any;
}


export interface DigiLockerResponse {
  result: {
    userDetails: DigiLockerUserDetails;
    files: DigiLockerFile[];
  };
}

export interface DigiLockerUserDetails {
  digilockerid: string;
  name: string;
  dob: string; // DD/MM/YYYY
  gender: "M" | "F" | "O" | string; 
  eaadhaar: "Y" | "N" | string;
  mobile: string;
}

export interface DigiLockerFile {
  name: string;
  type: string;
  size: string | number;
  date: string; // DD/MM/YYYY
  parent: string;
  mime: string[];
  doctype: string;
  description: string;
  issuerid: string;
  issuer: string;
  id: string;
}
