export interface SignzyV3Config {
  apiKey: string;
  baseUrl: string;
 }
export interface Contract360Response {
  pdf: string;
  username: string;
  workflow?: boolean;
  endOfLife?: number;
  contractId: string;
  customerId: string;
  isParallel?: boolean;
  callbackUrl: string;
  contractTtl: number;
  contractName: string;
  redirectTime?: number;
  signerdetail: SignerDetail[];
  eSignProvider: "NSDL" | "EMUDHRA" | string;
  callbackStatus?: Record<string, any>;
  contractStatus: string;
  smtpCredentials?: Record<string, any>;
  templateDetails?: Record<string, any>;
  customerMailList?: string[];
  contractExpiresOn?: string;
  isEncryptionOpted?: boolean;
  customSendingLogic?: Record<string, any>;
  failureRedirectUrl: string;
  nameMatchThreshold?: string;
  successRedirectUrl: string;
  allowSignerYOBMatch?: boolean;
  initialContractHash: string;
  "x-uniqueReferenceId": string;
  contractExecuterName: string;
  emudhraCustomization: EmudhraCustomization;
  locationCaptureMethod?: string;
  allowSignerGenderMatch?: boolean;
  initiationEmailSubject?: string;
  emailPdfCustomNameFormat?: string;
  allowUidLastFourDigitsMatch?: boolean;
  cancelContractOnSignerRejection?: boolean;
  cancelContractOnExceedAadhaarMatchLimit?: boolean;
  cancelContractOnExceedVerificationRetries?: boolean;
}

export interface SignerDetail {
  signerId: string;
  signatures: SignatureDetail[];
  signerName: string;
  signerEmail: string;
  workflowUrl?: string;
  signerGender?: string;
  signerMobile?: string;
  signatureType: string;
  cancelBySigner?: boolean;
  signerYearOfBirth?: string;
  uidLastFourDigits?: string;
}

export interface SignatureDetail {
  pageNo: string[];
  xCoordinate: number[] | string[];
  yCoordinate: number[] | string[];
  signaturePosition: string[];
}

export interface EmudhraCustomization {
  logoURL: string;
  buttonColour: string;
  headerColour: string;
  infoIconColour: string;
  linkTextColour: string;
  pageTextColour: string;
  errorTextColour: string;
  footerTextColour: string;
  successTextColour: string;
  maskedAadhaarField: string;
  pageBackgroundColour: string;
  errorBackgroundColour: string;
  secondaryButtonColour: string;
  textFieldBorderColour: string;
  footerBackgroundColour: string;
}
