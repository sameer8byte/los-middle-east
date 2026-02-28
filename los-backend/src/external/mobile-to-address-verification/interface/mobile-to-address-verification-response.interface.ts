import { BrandProviderName, AddressProofEnum } from "@prisma/client";

/**
 * Unified response shape for all mobile verification services
 */
export interface MobileVerificationUnifiedResponse {
  success: boolean;
  data: any;
  message: string;
  provider: BrandProviderName;
  raw: any;
}

/**
 * Address extraction result
 */
export interface ExtractedAddress {
  fullAddress: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  category?: string;
  lastSeenDate?: string;
}

/**
 * Service types available
 */
export type MobileServiceType = 
  | 'MOBILE_TO_ADDRESSES'
  | 'MOBILE_TO_ADDRESSES_ECOM'
  | 'MOBILE_TO_LPG_DETAILS'
  | 'MOBILE_TO_DL_ADVANCED';

/**
 * Batch verification response
 */
export interface MobileVerificationBatchResponse {
  mobileToAddresses: MobileVerificationUnifiedResponse | null;
  mobileToAddressesEcom: MobileVerificationUnifiedResponse | null;
  mobileToLpgDetails: MobileVerificationUnifiedResponse | null;
  mobileToDlAdvanced: MobileVerificationUnifiedResponse | null;
}

// REMOVED: ServiceTypeToAddressType constant since we're using enum directly