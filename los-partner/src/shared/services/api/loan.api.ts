import {
  PartnerUserRoleEnum,
  LoanStatusEnum,
  LoanXlsxFileType,
  ReminderType,
  PartnerTabsEnum,
} from "../../../constant/enum";
import { EmailType } from "../../../constant/emailTypes";
import { Pagination } from "../../types/pagination";
import api from "../axios";

// Email Reminder Configuration Interface
export interface EmailReminderConfig {
  id: string;
  brandId: string;
  reminderType: ReminderType;
  daysBeforeDue: number;
  isEnabled: boolean;
  frequency: "once" | "daily";
  loanStatuses: string[];
  subjectTemplate: string;
  bodyTemplate: string;
  emailType: EmailType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailReminderConfigDto {
  reminderType: ReminderType;
  daysBeforeDue: number;
  isEnabled?: boolean;
  frequency: "once" | "daily";
  loanStatuses: string[];
  subjectTemplate: string;
  bodyTemplate: string;
  emailType?: EmailType;
}

export interface UpdateEmailReminderConfigDto {
  daysBeforeDue?: number;
  isEnabled?: boolean;
  frequency?: "once" | "daily";
  loanStatuses?: string[];
  subjectTemplate?: string;
  bodyTemplate?: string;
}

export interface CreateAuthorizationDto {
  userId: string;
  loanId: string;
  brandId: string;
  maxAmount: number;
  expireAt: Date;
}

export interface AuthorizationCallbackDto {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface CreateRecurringPaymentDto {
  userId: string;
  loanId: string;
  amount: number;
  dueDate: Date;
  description?: string;
}

export interface SendBackToCeRequest {
  loanId: string;
  reason: string;
  targetRole: "CREDIT_MANAGER" | "SM_SH";
}

export interface SendBackToCeResponse {
  success: boolean;
  message: string;
  data: any;
}

export const createRecurringPayment = async (
  data: CreateRecurringPaymentDto
): Promise<any> => {
  const response = await api.post("/payment/recurring-payment", data);
  return response.data;
};

export const createUPIAuthorization = async (
  data: CreateAuthorizationDto
): Promise<any> => {
  const response = await api.post("/payment/authorization", data);
  return response.data;
};

export const handleAuthorizationCallback = async (
  data: AuthorizationCallbackDto
): Promise<any> => {
  const response = await api.post("/payment/authorization/callback", data);
  return response.data;
};

export const getAuthorizationStatus = async (
  authorizationId: string
): Promise<any> => {
  const response = await api.get(`/payment/authorization/${authorizationId}`);
  return response.data;
};

export const getAllLoans = async (
  brandId: string,
  partnerRole: PartnerTabsEnum,
  paginationDto: Pagination,
  filter?: Record<string, string>
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/loans/role/${partnerRole}?page=${
        paginationDto?.page || "1"
      }&limit=${paginationDto?.limit || "10"}${
        paginationDto?.dateFilter
          ? `&dateFilter=${paginationDto.dateFilter}`
          : ""
      }&status=${filter?.status ? filter.status : ""}&search=${
        filter?.search ? filter.search : ""
      }&pSenctionStatus=${
        filter?.pSenctionStatus ? filter.pSenctionStatus : ""
      }&loanAgreementStatus=${
        filter?.loanAgreementStatus ? filter.loanAgreementStatus : ""
      }&opsStatus=${
        filter?.opsStatus ? filter.opsStatus : ""
      }&assignedExecutive=${
        filter?.assignedExecutive ? filter.assignedExecutive : ""
      }&assignedSupervisor=${
        filter?.assignedSupervisor ? filter.assignedSupervisor : ""
      }&assignedCollectionExecutive=${
        filter?.assignedCollectionExecutive
          ? filter.assignedCollectionExecutive
          : ""
      }&assignedCollectionSupervisor=${
        filter?.assignedCollectionSupervisor
          ? filter.assignedCollectionSupervisor
          : ""
      }&loanType=${filter?.loanType ? filter.loanType : ""}${
        filter?.customDateFrom
          ? `&customDateFrom=${filter.customDateFrom}`
          : ""
      }${
        filter?.customDateTo
          ? `&customDateTo=${filter.customDateTo}`
          : ""
      }${
        filter?.salaryMin
          ? `&salaryMin=${filter.salaryMin}`
          : ""
      }${
        filter?.salaryMax
          ? `&salaryMax=${filter.salaryMax}`
          : ""
      }`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching loans:", error);
    throw error;
  }
};
// New function specifically for loans with signed agreements (for CSV download)
export const getSignedAgreementLoansForDownload = async (
  brandId: string,
  partnerRole: PartnerUserRoleEnum
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/loans/role/${partnerRole}/signed-agreements`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching signed agreement loans for download:", error);
    throw error;
  }
};

export const getLoanById = async (brandId: string, loanId: string) => {
  try {
    const response = await api.get(`/partner/brand/${brandId}/loans/${loanId}`);
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};
export const updateLoan = async (
  brandId: string,
  loanId: string,
  data: {
    loanId: string;
    status: LoanStatusEnum;
    reason: string;
    approvedLoanAmount?: number;
    approvedDueDate?: string | null;
    isPermanentlyBlocked?: boolean;
    ruleType?: string;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/${loanId}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const updateLoanWithReasons = async (
  brandId: string,
  loanId: string,
  data: {
    loanId: string;
    status: LoanStatusEnum;
    reason: string;
    approvedLoanAmount?: number;
    approvedDueDate?: string | null;
    isPermanentlyBlocked?: boolean;
    brandStatusReasonIds?: string[];
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/${loanId}/with-reasons`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error updating loan with reasons:", error);
    throw error;
  }
};

// @Get("brand/:brandId/get-loan-details/:loanId")
export const getLoanDetails = async (brandId: string, loanId: string) => {
  try {
    const response = await api.get(
      `/loans/brand/${brandId}/get-loan-details/${loanId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching loan details:", error);
    throw error;
  }
};

//   @Controller("partner/brand/:brandId/loans")
export const postLoansXlsx = async (
  brandId: string,
  data: {
    loanIds: string[];
    brandId: string;
    brandBankAccountId: string;
    fileType: LoanXlsxFileType;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/xlsx`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};
// csv
export const postLoansCsv = async (
  brandId: string,
  data: {
    loanIds: string[];
    brandId: string;
    brandBankAccountId: string;
    fileType: LoanXlsxFileType;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/csv`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

// loan-no-due-certificate"
export const generateLoanNoDueCertificate = async (
  brandId: string,
  loanId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/loan-no-due-certificate`,
      {
        brandId,
        loanId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error generating loan no due certificate:", error);
    throw error;
  }
};
//send-no-due-certificate-email
export const sendNoDueCertificateEmail = async (
  brandId: string,
  loanId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/send-no-due-certificate-email`,
      {
        loanId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error sending no due certificate email:", error);
    throw error;
  }
};

export const updateLoanAmount = async (
  brandId: string,
  userId: string,
  amount: number,
  loanId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/update-loan-amount`,
      {
        userId,
        amount,
        loanId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating loan amount:", error);
    throw error;
  }
};

export const manualStatusUpdate = async (
  loanId: string,
  newStatus: LoanStatusEnum
) => {
  try {
    const response = await api.post(
      `/payment/manual-status-update`,
      {
        loanId,
        newStatus,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating loan status:", error);
    throw error;
  }
};

export const postActiveLoan = async (brandId: string) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/sync-active-loan`
    );
    return response.data;
  } catch (error) {
    console.error("Error syncing active loans:", error);
    throw error;
  }
};

export const postCurrentRepayment = async (
  userId: string,
  loanId: string,
  repaymentDate: string
) => {
  try {
    const response = await api.post(`/loans/user/${userId}/current-repayment`, {
      userId,
      loanId,
      repaymentDate,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching current repayment:", error);
    throw error;
  }
};
export const postCurrentPartialRepayment = async (
  userId: string,
  loanId: string,
  amount: number,
  repaymentDate: string,
  isFinalPaymentPart: boolean = false
) => {
  try {
    const response = await api.post(
      `/loans/user/${userId}/current-partial-repayment`,
      {
        userId,
        loanId,
        amount,
        repaymentDate,
        isFinalPaymentPart,
        // discountAmount
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching current partial repayment:", error);
    throw error;
  }
};

export const relocateLoan = async (
  brandId: string,
  loanId: string,
  newPartnerUserId: string
) => {
  try {
    const response = await api.post(`/loans/brand/${brandId}/relocate-loan`, {
      loanId,
      newPartnerUserId,
    });
    return response.data;
  } catch (error) {
    console.error("Error relocating loan:", error);
    throw error;
  }
};

// @Get("loan-evaluation-details")

export const postLoanDetailsEvaluations = async (
  brandId: string,
  formattedLoanId: string,
  userId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/loan-evaluation-details`,
      {
        formattedLoanId,
        brandId,
        userId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching loan details evaluations:", error);
    throw error;
  }
};

export const revertLoanStatus = async (brandId: string, loanId: string) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/revert-loan-status`,
      {
        loanId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error reverting loan status:", error);
    throw error;
  }
};

export const sendBackToCreditExecutive = async (
  brandId: string,
  data: {
    loanId: string;
    reason: string;
    comments?: string;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/send-back-to-ce`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error sending back loan to CE:", error);
    throw error;
  }
};

export const sendBackToCreditExecutiveAndSanctionManager = async (
  brandId: string,
  data: SendBackToCeRequest
): Promise<SendBackToCeResponse> => {
  const response = await api.post<SendBackToCeResponse>(
    `/partner/brand/${brandId}/loans/send-back-to-ce-sm`,
    data
  );
  return response.data;
};

export const skipAutopayConsent = async (
  brandId: string,
  loanId: string,
  reason?: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/${loanId}/skip-autopay-consent`,
      { reason }
    );
    return response.data;
  } catch (error) {
    console.error("Error skipping autopay consent:", error);
    throw error;
  }
};

export const upsertClosingType = async (dto: {
  loanId: string;
  brandId: string;
}) => {
  try {
    const response = await api.post(
      `/loans/brand/${dto.brandId}/upsert-closing-type/${dto.loanId}`,
      {
        loanId: dto.loanId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating closing type:", error);
    throw error;
  }
};

// Email reminder functions
export const processEmailReminders = async (
  brandId: string,
  options?: {
    loanId?: string;
    triggerType?: string;
    campaignId?: string;
  }
) => {
  try {
    const queryParams = new URLSearchParams();
    if (options?.loanId) queryParams.append("loanId", options.loanId);
    if (options?.triggerType)
      queryParams.append("triggerType", options.triggerType);
    if (options?.campaignId)
      queryParams.append("campaignId", options.campaignId);

    const queryString = queryParams.toString();
    const baseUrl = `/partner/brand/${brandId}/loans/email-reminders/process`;
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    const response = await api.post(url);
    return response.data;
  } catch (error) {
    console.error("Error processing email reminders:", error);
    throw error;
  }
};

// Send test email reminder
export const sendTestEmailReminder = async (
  brandId: string,
  testData: {
    loanId: string;
    email: string;
    emailType: EmailType;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/email-reminders/test`,
      testData
    );
    return response.data;
  } catch (error) {
    console.error("Error sending test email reminder:", error);
    throw error;
  }
};

// Email Reminder Log Interface
export interface EmailReminderLog {
  id: string;
  loanId: string;
  emailType: EmailType;
  sentAt: string;
  createdAt: string;
  success: boolean;
  error?: string;
  recipient?: string;
  loan: {
    formattedLoanId: string;
    user: {
      email: string;
      userDetails: {
        firstName: string;
        lastName: string;
      } | null;
    };
  };
}

export interface EmailReminderStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
}

export interface EmailReminderLogsResponse {
  data: EmailReminderLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getEmailReminderLogs = async (
  brandId: string,
  filters?: {
    loanId?: string;
    success?: boolean;
    limit?: number;
    page?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }
): Promise<EmailReminderLogsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.loanId) queryParams.append("loanId", filters.loanId);
    if (filters?.success !== undefined)
      queryParams.append("success", filters.success.toString());
    if (filters?.limit) queryParams.append("limit", filters.limit.toString());
    if (filters?.page) queryParams.append("page", filters.page.toString());
    if (filters?.dateFrom) queryParams.append("dateFrom", filters.dateFrom);
    if (filters?.dateTo) queryParams.append("dateTo", filters.dateTo);
    if (filters?.search) queryParams.append("search", filters.search);

    const queryString = queryParams.toString();
    const baseUrl = `/partner/brand/${brandId}/loans/email-reminders/logs`;
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching email reminder logs:", error);
    throw error;
  }
};

// For downloading all logs without pagination
export const getAllEmailReminderLogs = async (
  brandId: string,
  filters?: {
    loanId?: string;
    success?: boolean;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }
): Promise<EmailReminderLog[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.loanId) queryParams.append("loanId", filters.loanId);
    if (filters?.success !== undefined)
      queryParams.append("success", filters.success.toString());
    if (filters?.dateFrom) queryParams.append("dateFrom", filters.dateFrom);
    if (filters?.dateTo) queryParams.append("dateTo", filters.dateTo);
    if (filters?.search) queryParams.append("search", filters.search);
    queryParams.append("all", "true"); // Special parameter to get all records

    const queryString = queryParams.toString();
    const baseUrl = `/partner/brand/${brandId}/loans/email-reminders/logs`;
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    const response = await api.get(url);
    return response.data.data || response.data; // Handle both formats
  } catch (error) {
    console.error("Error fetching all email reminder logs:", error);
    throw error;
  }
};

export const getEmailReminderStats = async (
  brandId: string
): Promise<EmailReminderStats> => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/loans/email-reminders/stats`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching email reminder stats:", error);
    throw error;
  }
};

// Email Reminder Configuration Response Interface
export interface EmailReminderConfigsResponse {
  configs: EmailReminderConfig[];
  total: number;
  enabled: number;
  disabled: number;
}

// Email Reminder Configuration APIs
export const getEmailReminderConfigs = async (
  brandId: string
): Promise<EmailReminderConfigsResponse> => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/email-reminder-configs`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching email reminder configs:", error);
    throw error;
  }
};

export const createEmailReminderConfig = async (
  brandId: string,
  config: CreateEmailReminderConfigDto
): Promise<EmailReminderConfig> => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/email-reminder-configs`,
      config
    );
    return response.data;
  } catch (error) {
    console.error("Error creating email reminder config:", error);
    throw error;
  }
};

export const updateEmailReminderConfig = async (
  brandId: string,
  configId: string,
  config: UpdateEmailReminderConfigDto
): Promise<EmailReminderConfig> => {
  try {
    const response = await api.put(
      `/partner/brand/${brandId}/email-reminder-configs/${configId}`,
      config
    );
    return response.data;
  } catch (error) {
    console.error("Error updating email reminder config:", error);
    throw error;
  }
};

export const deleteEmailReminderConfig = async (
  brandId: string,
  configId: string
) => {
  try {
    const response = await api.delete(
      `/partner/brand/${brandId}/email-reminder-configs/${configId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting email reminder config:", error);
    throw error;
  }
};

export const toggleEmailReminderConfig = async (
  brandId: string,
  configId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/email-reminder-configs/${configId}/toggle`
    );
    return response.data;
  } catch (error) {
    console.error("Error toggling email reminder config:", error);
    throw error;
  }
};

export const resetEmailReminderConfigsToDefaults = async (brandId: string) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/email-reminder-configs/reset-defaults`
    );
    return response.data;
  } catch (error) {
    console.error("Error resetting email reminder configs:", error);
    throw error;
  }
};

export const getEmailReminderDefaultTemplates = async (brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/email-reminder-configs/templates/defaults`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching email reminder default templates:", error);
    throw error;
  }
};

export const reactivateLoan = async (
  brandId: string,
  loanId: string,
  reason: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/${loanId}/reactivate`,
      {
        loanId,
        reason,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error reactivating loan:", error);
    throw error;
  }
};

export const forceBypassReports = async (
  brandId: string,
  loanId: string,
  reason?: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/${loanId}/force-bypass-reports`,
      {
        loanId,
        reason,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error forcing bypass reports:", error);
    throw error;
  }
};
// Collection Partner APIs
export interface CollectionPartnerAllocation {
  partnerUserId: string;
  remarks?: string;
}

export interface CollectionPartner {
  id: string;
  partnerUserId: string;
  allocatedAt: string;
  deallocatedAt?: string;
  isActive: boolean;
  remarks?: string;
  partnerUser: {
    id: string;
    name: string;
    email: string;
    reportsToId?: string;
  };
}

export const allocateCollectionPartner = async (
  brandId: string,
  loanId: string,
  allocation: CollectionPartnerAllocation
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/${loanId}/collection-partners`,
      allocation
    );
    return response.data;
  } catch (error) {
    console.error("Error allocating collection partner:", error);
    throw error;
  }
};

export const deallocateCollectionPartner = async (allocationId: string) => {
  try {
    const response = await api.delete(
      `/partner/loans/collection-partners/${allocationId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deallocating collection partner:", error);
    throw error;
  }
};

// Bulk allocation APIs
export interface BulkAllocationRequest {
  targetPartnerUserIds?: string[]; // Support multiple target partners
  targetPartnerUserId?: string; // Keep for backward compatibility
  dueDateFrom?: string; // ISO date string (start date) - Optional for all-time mode
  dueDateTo?: string; // ISO date string (end date for range) - Optional for all-time mode
  sourcePartnerUserIds?: string[]; // Support multiple source partners
  sourcePartnerUserId?: string; // Keep for backward compatibility - If specified, only allocate loans from this partner
  loanCurrentStatus?: "both" | "overdue" | "not-overdue"; // Filter by overdue status
  remarks?: string;
}

export interface BulkAllocationResponse {
  success: boolean;
  message: string;
  allocatedCount: number;
  failedLoans?: string[];
  allocationSummary?: Array<{
    partnerId: string;
    partnerName: string;
    allocatedLoans: number;
  }>;
}

export const bulkAllocateCollectionPartnersByDueDate = async (
  brandId: string,
  request: BulkAllocationRequest
): Promise<BulkAllocationResponse> => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/collection-partners/bulk-allocate-by-due-date`,
      request
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error bulk allocating collection partners by due date:",
      error
    );
    throw error;
  }
};

// Get loans by due date and/or partner for preview
export interface LoanPreview {
  id: string;
  formattedLoanId: string;
  amount: number;
  status: string;
  dueDate: string;
  user: {
    userDetails: {
      firstName?: string;
      lastName?: string;
    } | null;
  };
  loanDetails: {
    dueDate: string;
  };
  loan_collection_allocated_partner: CollectionPartner[];
}

export const getLoansByDueDateAndPartner = async (
  brandId: string,
  filters: {
    dueDateFrom?: string; // Optional for all-time mode
    dueDateTo?: string; // Optional for all-time mode
    sourcePartnerUserIds?: string[]; // Support multiple source partners
    sourcePartnerUserId?: string; // Keep for backward compatibility
    loanCurrentStatus?: "both" | "overdue" | "not-overdue";
  }
): Promise<LoanPreview[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (filters.dueDateFrom) {
      queryParams.append("dueDateFrom", filters.dueDateFrom);
    }
    if (filters.dueDateTo) {
      queryParams.append("dueDateTo", filters.dueDateTo);
    }

    // Handle multiple source partners
    if (
      filters.sourcePartnerUserIds &&
      filters.sourcePartnerUserIds.length > 0
    ) {
      queryParams.append(
        "sourcePartnerUserIds",
        filters.sourcePartnerUserIds.join(",")
      );
    } else if (filters.sourcePartnerUserId) {
      // Backward compatibility
      queryParams.append("sourcePartnerUserId", filters.sourcePartnerUserId);
    }

    if (filters.loanCurrentStatus) {
      queryParams.append("loanCurrentStatus", filters.loanCurrentStatus);
    }

    const response = await api.get(
      `/partner/brand/${brandId}/loans/collection-partners/by-due-date-and-partner?${queryParams.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching loans by due date and partner:", error);
    throw error;
  }
};
export const clearLoansCache = async (brandId: string) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/cache/clear`
    );
    return response.data;
  } catch (error) {
    console.error("Error clearing loans cache:", error);
    throw error;
  }
};

export const bulkRelocateLoans = async (
  brandId: string,
  params: {
    loanIds?: string[];
    targetPartnerUserIds?: string[];
    createdFrom?: string;
    createdTo?: string;
    sourcePartnerUserIds?: string[];
    loanStatus?: string[];
    isAllTime?: boolean;
    remarks?: string;
  }
) => {
  try {
    const response = await api.post(
      `/loans/brand/${brandId}/bulk-relocate-loans`,
      params
    );
    return response.data;
  } catch (error) {
    console.error("Error bulk relocating loans:", error);
    throw error;
  }
};

export const getLoansForAllocation = async (
  brandId: string,
  params: {
    createdFrom?: string;
    createdTo?: string;
    sourcePartnerUserIds?: string[];
    loanStatus?: string[];
    isAllTime?: boolean;
    page?: number;
    limit?: number;
  }
) => {
  try {
    const response = await api.post(
      `/loans/brand/${brandId}/loans-for-allocation`,
      params
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching loans for allocation:", error);
    throw error;
  }
};

export const getUnallocatedLoans = async (
  brandId: string,
  params: {
    page?: number;
    limit?: number;
    search?: string
  }
) => {
  try {
    const response = await api.get(`loans/brand/${brandId}/unallocated-loans`, {params}
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching unallocated loans:", error);
    throw error;
  }
}

export const getLoanRuleTenures = async (brandId: string) => {
  try {
    const response = await api.get(
      `/loans/brand/${brandId}/loan-rule-tenures`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching loan rule tenures:", error);
    throw error;
  }
};

export const calculateRepaymentForPartner = async (
  brandId: string,
  body: {
    userId: string;
    requestAmount: number;
    tenureId: string;
    requestedDueDate: string | null;
  }
) => {
  try {
    const response = await api.post(
      `/loans/brand/${brandId}/calculate-repayment`,
      body
    );
    return response.data;
  } catch (error) {
    console.error("Error calculating repayment for partner:", error);
    throw error;
  }
};

export const getNoDuePending = async (
  brandId: string,
  paginationDto: Pagination,
  filters?: { search?: string }
) => {
  try {
    const queryParams = new URLSearchParams({
      page: String(paginationDto?.page || "1"),
      limit: String(paginationDto?.limit || "10"),
    });

    if (paginationDto?.dateFilter) {
      queryParams.append("dateFilter", paginationDto.dateFilter);
    }

    if (filters?.search) {
      queryParams.append("search", filters.search);
    }

    const response = await api.get(
      `/partner/brand/${brandId}/loans/no-due-pending?${queryParams.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching no due pending loans:", error);
    throw error;
  }
};

export const getCompletedLoans = async (
  brandId: string,
  paginationDto: Pagination,
  filters?: { status?: string; search?: string }
) => {
  try {
    const queryParams = new URLSearchParams({
      page: String(paginationDto?.page || "1"),
      limit: String(paginationDto?.limit || "10"),
    });

    // Add dateFilter if it exists
    if (paginationDto?.dateFilter && paginationDto.dateFilter !== "") {
      queryParams.append("dateFilter", paginationDto.dateFilter);
    }

    if (filters?.status) {
      queryParams.append("status", filters.status);
    }

    if (filters?.search) {
      queryParams.append("search", filters.search);
    }

    const response = await api.get(
      `/partner/brand/${brandId}/completed-loans?${queryParams.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching completed loans:", error);
    throw error;
  }
};


export const getDisbursedAmountByDate = async (
  brandId: string,
  params?: {
    disbursementDateFrom?: string;
    disbursementDateTo?: string;
  }
) => {
  try {
    const response = await api.get(`/partner/brand/${brandId}/loans/disbursed-amount`, {
      params,
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching disbursed amount:', error);
    throw error;
  }
};

export const updateFieldVisit = async (
  brandId: string,
  loanId: string,
  requireFieldVisit: boolean
) => {
  const response = await api.post(
    `/partner/brand/${brandId}/loans/${loanId}/field-visit`,
    { requireFieldVisit }
  );
  return response.data;
};

export const getFieldVisit = async (brandId: string, loanId: string) => {
  const response = await api.get(
    `/partner/brand/${brandId}/loans/${loanId}/field-visit`
  );
  return response.data;
};

export const getBulkFieldVisits = async (brandId: string, loanIds: string[]) => {
  const response = await api.get(
    `/partner/brand/${brandId}/loans/field-visits/bulk`,
    {
      params: {
        loanIds: loanIds.join(',')
      }
    }
  );
  return response.data;
};

export const getLoanStatement = async (userId: string, loanId: string) => {
  try {
    const response = await api.get(
      `/loans/user/${userId}/loan/${loanId}/statement`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching loan statement:', error);
    throw error;
  }
};