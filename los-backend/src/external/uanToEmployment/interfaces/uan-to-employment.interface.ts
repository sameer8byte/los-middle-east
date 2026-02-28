export interface UanToEmploymentRequest {
  uan?: string;
  pan?: string;
  mobile?: string;
  dob?: string;
  employeeName?: string;
  groupId?: string;
  checkId?: string;
}

export interface EmploymentRecord {
  employerName?: string;
  joinDate?: string;
  exitDate?: string;
  designation?: string;
  salary?: string;
  employerAddress?: string;
  epfoOffice?: string;
  membershipStatus?: string;
  contributionStatus?: string;
  memberId?: string;
  establishmentId?: string;
  tenureOfEmployment?: number;
}

export interface UanToEmploymentResponse {
  success: boolean;
  employmentHistory?: EmploymentRecord[];
  employeeDetails?: {
    name?: string;
    fatherName?: string;
    dateOfBirth?: string;
    uan?: string;
    pan?: string;
    gender?: string;
    mobile?: string;
  };
  message?: string;
  provider: string;
  raw?: any;
}

// Signzy specific interfaces
export interface SignzyUanToEmploymentRequest {
  uan: string;
  pan?: string;
  mobile?: string;
  dob?: string;
  employeeName?: string;
}

export interface SignzyUanToEmploymentResponse {
  result: {
    uan: string;
    memberId: string;
    name: string;
    fatherOrHusbandName: string;
    establishmentId: string;
    establishmentName: string;
    dateOfJoining: string;
    dateOfExit: string;
    tenureOfEmployment: number;
  }[];
  additionalDetails: {
    limitedOutput: boolean;
    uanDataSource: {
      uan: string;
      source: string;
    }[];
    recentEmployerData: {
      establishmentName: string;
      establishmentId: string;
      memberId: string;
      dateOfExit: string;
      dateOfJoining: string;
      leaveReason: string;
      employerConfidenceScore: number | null;
    };
    uanDetails: {
      [key: string]: {
        basicDetails: {
          gender: string;
          dateOfBirth: string;
          employeeConfidenceScore: number | null;
          name: string;
          mobile: string;
          aadhaarVerificationStatus: number;
        };
        employmentDetails: {
          establishmentName: string;
          establishmentId: string;
          memberId: string;
          dateOfExit: string;
          dateOfJoining: string;
          leaveReason: string;
          employerConfidenceScore: number | null;
        };
      };
    }[];
  };
}

// KycKart specific interfaces
export interface KycKartUanToEmploymentRequest {
  uan: string;
  groupId: string;
  checkId: string;
}

export interface KycKartUanToEmploymentResponse {
  status: {
    statusCode: number;
    statusMessage: string;
    transactionId: string;
    checkId: string;
    groupId: string;
    input: {
      uan: string;
    };
    timestamp: string;
  };
  response: {
    uan: string;
    name: string;
    guardian_name: string;
    establishment_name: string;
    member_id: string;
    date_of_joining: string;
    date_of_exit: string;
  }[];
}

// Add to your interfaces file
export interface DigitapMobileToEmploymentResponse {
  http_response_code: number;
  client_ref_num: string;
  request_id: string;
  result_code: number;
  result: {
    uan: string[];
    summary: {
      recent_employer_data: {
        member_id: string;
        establishment_id: string;
        date_of_exit: string;
        date_of_joining: string;
        establishment_name: string;
        employer_confidence_score: number | null;
        matching_uan: string;
      };
      is_employed: boolean;
      employee_name_match: string | null;
      employer_name_match: string | null;
      uan_count: number;
      date_of_exit_marked: boolean;
    };
    uan_details: {
      [uan: string]: {
        basic_details: {
          gender: string;
          date_of_birth: string;
          employee_confidence_score: number | null;
          name: string;
          mobile: string;
          aadhaar_verification_status: number;
        };
        employment_details: {
          member_id: string;
          establishment_id: string;
          date_of_exit: string;
          date_of_joining: string;
          leave_reason: string;
          establishment_name: string;
          employer_confidence_score: number | null;
        };
        employment_history?: Array<{  // Add this
          establishment_name: string;
          establishment_id: string;
          member_id: string;
          date_of_exit: string;
          date_of_joining: string;
          leave_reason: string;
          employment_period_in_months: number;
          employer_confidence_score: number | null;
        }>;
      };
    };
    uan_source: Array<{
      uan: string;
      source: string;
    }>;
    name_dob_filtering_score: number | null;
  };
  input_data: {
    mobile: string;
  };
}