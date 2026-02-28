export interface PANDetailsPlus {
  http_response_code: number;
  result_code: number;
  request_id: string;
  client_ref_num: string;
  result: {
    pan: string;
    pan_type: "Individual" | "Company" | "Firm" | "HUF" | "Trust" | string;
    fullname: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    gender: "male" | "female" | "other" | string;
    aadhaar_number: string;
    aadhaar_linked: boolean;
    dob: string; // format: 'DD/MM/YYYY'
    address: {
      building_name: string;
      locality: string;
      street_name: string;
      pincode: string;
      city: string;
      state: string;
      country: string;
    };
    mobile: string;
    email: string;
  };
}

export interface MobileToAccountDetails {
  http_response_code: number;
  client_ref_num: string;
  request_id: string;
  result_code: number;
  message: string;
  result: {
    vpa_details: {
      vpa: string;
      account_holder_name: string;
      name_match: string; // this is "true" as a string, not boolean
      name_match_score: number;
    };
    account_details: {
      account_number: string;
      account_ifsc: string;
      amount_deposited: string; // this is a string, e.g., "1.00"
    };
  };
}

export interface MobiletoPrefill {
  http_response_code: number;
  client_ref_num: string;
  request_id: string;
  result_code: number;
  message: string;
  result: {
    name: string;
    dob: string; // Format: "DD-MM-YYYY"
    gender: string; // Note the space after 'gender' — kept as-is for accuracy
    pan: string;
    email: string; // Note the space after 'email' — kept as-is for accuracy
    address: {
      first_line_of_address: string;
      second_line_of_address: string;
      third_line_of_address: string;
      city: string;
      state: string;
      postal_code: string;
      country_code: string;
    }[];
    score: string; // Note the space after 'score' — kept as-is for accuracy
  };
}

export interface VPAToAccountDetails {
  http_response_code: number;
  client_ref_num: string;
  request_id: string;
  result_code: number;
  message: string;
  result: {
    vpa_details: {
      vpa: string;
      account_holder_name: string;
      name_match: boolean; // now correctly typed as boolean
      name_match_score: number;
    };
    account_details: {
      account_number: string;
      account_ifsc: string;
      amount_deposited: string;
    };
  };
}

export interface MobileToPAN {
  http_response_code: number;
  client_ref_num: string;
  request_id: string;
  result_code: number;
  message: string;
  result: {
    name: string;
    pan: string;
  };
}

interface AadhaarModel {
  dob: string;
  link: string;
  name: string;
  image: string;
  careOf: string;
  gender: string;
  address: AadhaarAddress;
  passCode: string;
  uniqueId: string;
  isXmlValid: string;
  adharNumber: string;
  referenceId: string;
  maskedAdharNumber: string;
}

export interface AadhaarResponse {
  msg: string;
  code: string;
  model: AadhaarModel;
}

export interface DigitapUnifiedUrlResponse {
  code: string;
  model: {
    url: string;
    uniqueId: string;
    unifiedTransactionId: string;
    shortUrl: string;
  };
  error: any | null;
}

export interface AadhaarKycApiResponse {
  code: string;
  model: AadhaarKycModel;
  msg: string;
}
 interface AadhaarKycModel {
  uniqueId: string;
  source: string;
  referenceId: string;
  maskedAdharNumber: string;
  name: string;
  gender: string;
  dob: string;
  careOf: string;
  passCode: string | null;
  address: AadhaarAddress;
  link: string;
  pdfLink: string;
  image: string;
  image_url: string | null;
}
 interface AadhaarAddress {
  house: string;
  street: string;
  landmark: string;
  loc: string;
  po: string;
  dist: string;
  subdist: string;
  vtc: string;
  pc: string;
  state: string;
  country: string;
}
