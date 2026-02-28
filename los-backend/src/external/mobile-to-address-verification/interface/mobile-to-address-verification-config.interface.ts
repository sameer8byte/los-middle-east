export interface MobileVerificationConfig {
  kycKart: {
    baseUrl: string;
    apiKey: string;
  };
  // Future providers can be added here
  // newProvider: {
  //   baseUrl: string;
  //   apiKey: string;
  //   // other config
  // };
}

export interface KycKartMobileToAddressesResponse {
  status: {
    statusCode: number;
    statusMessage: string;
    transactionId: string;
    checkId?: string;
    groupId?: string;
    input: {
      mobileNo: string;
    };
    timestamp: string;
  };
  response: {
    mobileNo: string;
    addresses: Array<{
      category: string;
      address: string;
      lastSeenDate: string;
    }>;
  };
}

export interface KycKartMobileToAddressesEcomResponse {
  status: {
    statusCode: number;
    statusMessage: string;
    transactionId: string;
    checkId?: string;
    groupId?: string;
    input: {
      mobileNo: string;
    };
    timestamp: string;
  };
  response: {
    code: string;
    mobileNo: string;
    addresses: Array<{
      firstName: string;
      lastName: string;
      email: string;
      isdCode: string;
      line1: string;
      line2: string;
      city: string;
      pincode: string;
      state: string;
      stateCode: string;
      country: string;
      countryCode: string;
      lastDeliveryDate: string;
      creationDate: string;
      lastSeenDate: string;
    }>;
  };
}

export interface KycKartMobileToLpgDetailsResponse {
  status: {
    statusCode: number;
    statusMessage: string;
    transactionId: string;
    checkId?: string;
    groupId?: string;
    input: {
      mobileNo: string;
    };
    timestamp: string;
  };
  response: Array<{
    code: number;
    provider: string;
    name: string;
    address: string;
    mobile: string;
    id: string;
    status: string;
    type: string;
    distributor_code: string;
    distributor_name: string;
    distributor_contact: string;
    distributor_address: string;
  }>;
}

export interface KycKartMobileToDLAdvancedResponse {
  status: {
    statusCode: number;
    statusMessage: string;
    transactionId: string;
    input: {
      mobileNo: number;
    };
    timestamp: string;
  };
  response: {
    mobileNo: number;
    user_address: Array<{
      addressLine1: string;
      completeAddress: string;
      country: string;
      district: string;
      pin: string;
      state: string;
      type: string;
    }>;
    user_blood_group: string;
    dl_number: string;
    user_dob: string;
    endorse_date: string;
    endorse_number: string;
    expiry_date: string;
    father_or_husband: string;
    issued_date: string;
    non_transport_validity: {
      from: string;
      to: string;
    };
    state: string;
    category: string;
    status: string;
    status_details: {
      from: string;
      remarks: string;
      to: string;
    };
    transport_validity: {
      from: string;
      to: string;
    };
    user_full_name: string;
    user_image: string;
    vehicle_category_details: Array<{
      cov: string;
      expiryDate: string;
      issueDate: string;
    }>;
  };
}