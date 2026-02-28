import api from "../axios";

// Base report data interface
export interface BaseReportItem {
  id: string;
  formattedLoanId: string;
  amount: number;
  status: string;
  createdAt: string;
  disbursementDate?: string;
  user?: {
    userDetails?: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
      email?: string;
      dateOfBirth?: string;
      gender?: string;
      address?: string;
      pincode?: string;
      city?: string;
      state?: string;
      panNumber?: string;
      aadharNumber?: string;
      profilePicture?: string;
    };
  };
}

// Master report user interface - User-focused data structure
export interface MasterReportUser {
  id: string;
  formattedUserId?: string;
  CustomerId?: string;
  Name?: string;
  Mobile?: string;
  PersonalEmail?: string;
  DOB?: string;
  Gender?: string;
  CreatedAt?: string;
  onboardingStep?: string;
  AadhaarVerified?: boolean;
  PANVerified?: boolean;
  MarketingSource?: string;
  RejectionReason?: string;
  EmploymentType?: string;
  MonthlyIncome?: string | number;
  CompanyName?: string;
  BeneficiaryName?: string;
  AccountNumber?: string;
  BankName?: string;
  PinCode?: string;
  State?: string;
  City?: string;
  ResidenceAddress?: string;
  ReferenceName1?: string;
  ReferenceNumber1?: string;
  ReferenceRelation1?: string;
  ReferenceName2?: string;
  ReferenceNumber2?: string;
  ReferenceRelation2?: string;
  LoanIDs?: string;
  LoanStatuses?: string;
  LoanAmounts?: string;
  LoanStatusHistory?: string;
  BrandStatusReasons?: string;
  // Additional user fields as returned by backend
  [key: string]: any;
}

// Marketing report interface
export interface MarketingReportItem {
  id: string;
  formattedUserId?: string;
  userId?: string;
  LoanId?: string;
  Domain?: string;
  LeadStage?: string;
  RejectionRemarks?: string;
  CreatedAt?: string;
  // UpdatedAt?: string;
  [key: string]: any;
}

// Completed no repayment report interface
export interface CompletedNoRepaymentReportItem {
  id: string;
  formattedLoanId: string;
  status: string;
  createdAt: string;
  user?: {
    formattedUserId?: string;
  };
  loanDetails?: {
    dueDate?: string;
  };
}

// Union type for all possible report data types
export type ReportData = BaseReportItem | MasterReportUser | MarketingReportItem | CompletedNoRepaymentReportItem;

export const getReport = async (
  reportType: string,
  fromDate: string,
  toDate: string,
  brandId: string
): Promise<ReportData[]> => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/report/${reportType}`,
      {
        params: {
          fromDate,
          toDate,
        },
      }
    );
    
    // The backend returns unknown[] but we know the structure based on report type
    const data = response.data as unknown[];
    
    // Type assertion based on report type
    if (reportType === 'master-report') {
      return data as MasterReportUser[];
    }
    
    if (reportType === 'marketing-report') {
      return data as MarketingReportItem[];
    }
    
    if (reportType === 'completed-no-repayment-report') {
      return data as CompletedNoRepaymentReportItem[];
    }
    
    return data as BaseReportItem[];
  } catch (error) {
    console.error("Error fetching report:", error);
    throw error;
  }
};

export const exportReportToCSV = async (
  reportType: string,
  fromDate: string,
  toDate: string,
  brandId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/report/${reportType}/csv`,
      {
        params: {
          fromDate,
          toDate,
        },
        responseType: "stream", // Ensure the response is a stream for file download
      }
    );
    return response.data; // This will be a stream that can be piped to a file
  } catch (error) {
    throw error;
  }
};

export const downloadReport = async (
  reportType: string,
  fromDate: string,
  toDate: string,
  brandId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/report/${reportType}/download`,
      {
        params: {
          fromDate,
          toDate,
        },
        responseType: "stream", // Ensure the response is a stream for file download
      }
    );
    return response.data; // This will be a stream that can be piped to a file
  } catch (error) {
    throw error;
  }
};
