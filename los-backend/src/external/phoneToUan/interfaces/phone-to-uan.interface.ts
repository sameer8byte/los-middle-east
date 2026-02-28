export interface PhoneToUanRequest {
  mobileNumber: string;
  checkId?: string;
  groupId?: string;
}

export interface PhoneToUanResponse {
  success: boolean;
  uan?: string;
  uanList?: string[];
  employeeDetails?: {
    name?: string;
    fatherName?: string;
    dateOfBirth?: string;
    joinDate?: string;
    exitDate?: string;
    employerName?: string;
    employerAddress?: string;
  };
  message?: string;
  provider: string;
  raw?: any;
}

// Signzy specific interfaces
export interface SignzyPhoneToUanRequest {
  mobileNumber: string;
}

export interface SignzyPhoneToUanResponse {
  uanNumber?: string;
  requestId?: string;
  result?: {
    uan: string;
    name: string;
    fatherName: string;
    dateOfBirth: string;
    joinDate: string;
    exitDate: string;
    employerName: string;
    employerAddress: string;
  };
  responseCode?: string;
  responseStatus?: string;
  error?: string;
  message?: string;
}

// KycKart specific interfaces
export interface KycKartPhoneToUanRequest {
  mobileNo: string;
  checkId: string;
  groupId: string;
}

export interface KycKartPhoneToUanResponse {
  status: {
    statusCode: number;
    statusMessage: string;
    transactionId: string;
    checkId: string;
    groupId: string;
    input: {
      mobileNo: string;
    };
    timestamp: string;
  };
  response: {
    code: string;
    uan_list: string[];
  };
}
