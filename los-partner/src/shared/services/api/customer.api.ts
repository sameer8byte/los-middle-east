import { ReloanStatus } from "../../../constant/enum";
import { Employment } from "../../types/customers";
import { Pagination } from "../../types/pagination";
import api from "../axios";

export const getAllCustomers = async (
  brandId: string,
  paginationDto: Pagination,
  filter?: Record<string, string>
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers?page=${
        paginationDto?.page || "1"
      }&limit=${paginationDto?.limit || "10"}${
        paginationDto?.dateFilter
          ? `&dateFilter=${paginationDto.dateFilter}`
          : ""
      }&status=${filter?.status || []}&kycStatus=${filter?.kycStatus || []}
      &search=${filter?.search ? filter?.search : ""}${
        filter?.userReloanStatus
          ? `&userReloanStatus=${filter?.userReloanStatus}`
          : ""
      }${
        filter?.allottedPartnerUserIds
          ? `&allottedPartnerUserIds=${filter?.allottedPartnerUserIds}`
          : ""
      }${
        filter?.allottedSupervisorIds
          ? `&allottedSupervisorIds=${filter?.allottedSupervisorIds}`
          : ""
      }${filter?.loanCount ? `&loanCount=${filter?.loanCount}` : ""}${
        filter?.salaryRange
          ? `&salaryRange=${encodeURIComponent(filter.salaryRange)}`
          : ""
      }${
        filter?.customDateFrom
          ? `&customDateFrom=${filter.customDateFrom}`
          : ""
      }${
        filter?.customDateTo
          ? `&customDateTo=${filter.customDateTo}`
          : ""
      }
      ${filter?.salaryMin ? `&salaryMin=${filter.salaryMin}` : ""}
      ${filter?.salaryMax ? `&salaryMax=${filter.salaryMax}` : ""}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
};

export const getCustomerById = async (userId: string, brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/profile`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const getCustomerDocuments = async (userId: string, brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/documents`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const getCustomerSignedDocuments = async (userId: string, brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/signed-documents`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching signed documents:", error);
    throw error;
  }
};

// Get no due certificates for a user
export const getCustomerNoDueCertificates = async (userId: string, brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/no-due-certificates`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching no due certificates:", error);
    throw error;
  }
};
// @Get(":userId/repayment-timeline")
// async getCustomerRepaymentTimeline(
//   @Param("userId") userId: string,
//   @Param("brandId") brandId: string
// ) {
export const getCustomerRepaymentTimeline = async (
  userId: string,
  brandId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/repayment-timeline`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const getCustomerDetails = async (userId: string, brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/user-details`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};


export const getCustomerAlternatePhoneLoans = async (
  userId: string,
  brandId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/alternate-phone-numbers-loans`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching alternate phone loans:", error);
    throw error;
  }
};

export const getCustomerEmployment = async (
  userId: string,
  brandId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/employment`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const getCustomerLoans = async (userId: string) => {
  try {
    const response = await api.get(`/loans/user/${userId}/get-loans`);
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const getCustomerRepayments = async (
  userId: string,
  brandId: string,
  loanId: string
) => {
  try {
    console.log("getCustomerRepayments", userId, brandId, loanId);
    const response = await api.get(`/loans/${loanId}/get-repayments`);
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const getCustomerSummary = async (userId: string, brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/summary`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const getBsaReport = async (
  userId: string,
  brandId: string,
  bankAccountStatementId: string,
  userBankAccountId: string
) => {
  try {
    console.log("getBsaReport", bankAccountStatementId);
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/bsa-report?userBankAccountId=${userBankAccountId}&bankAccountStatementId=${bankAccountStatementId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const uploadVerifiedDocument = async (
  userId: string,
  brandId: string,
  formData: FormData
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/upload-verification-documents`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

// @Post(":userId/upsert-other-documents")
export const upsertOtherDocument = async (
  userId: string,
  brandId: string,
  formData: FormData
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/upsert-other-documents`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

// Update document number for approved documents
export const updateDocumentNumber = async (
  userId: string,
  brandId: string,
  documentType: string,
  documentNumber: string
) => {
  try {
    const response = await api.patch(
      `/partner/brand/${brandId}/customers/${userId}/update-document-number`,
      {
        documentType,
        documentNumber,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating document number:", error);
    throw error;
  }
};

export const uploadBankAccountStatement = async (
  brandId: string,
  userId: string,
  bankAccountId: string,
  data: FormData
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/bank-account/${bankAccountId}/statement`,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading bank account statement:", error);
    throw error;
  }
};

export const generateAccessToken = async (
  userId: string,
  brandId: string,
  partnerUserId: string,
  loanId: string | null = null
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/call-requests/generate-access-token`,
      { userId, partnerUserId: partnerUserId, loanId: loanId ? loanId : null }
    );
    return response.data;
  } catch (error) {
    console.error("Error generating access token:", error);
    throw error;
  }
};

export const getAlternatePhoneNumbers = async (
  userId: string,
  brandId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/alternate-phone-numbers`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching alternate phone numbers:", error);
    throw error;
  }
};

export const getCustomerAddresses = async (userId: string, brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/get-addresses`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching customer addresses:", error);
    throw error;
  }
};

export const addCustomerAddress = async (
  userId: string,
  brandId: string,
  data: {
    id?: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    addressProofType: string; // Assuming AddressProofEnum is a string
    filePrivateKey?: string;
    isActive?: boolean;
    isDisabled?: boolean;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/alternate-addresses`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error adding customer address:", error);
    throw error;
  }
};
//
export const sendAadhaarLink = async (userId: string, brandId: string) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/send-aadhaar-link`,
      {
        userId: userId,
        brandId: brandId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error sending Aadhaar link:", error);
    throw error;
  }
};
export const getManualVerificationDetails = async (
  userId: string,
  brandId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/manual-verification-details`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching manual verification details:", error);
    throw error;
  }
};

export const upsertCustomerEmployment = async (
  userId: string,
  brandId: string,
  data: Partial<Employment>
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/employment`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error upserting customer employment:", error);
    throw error;
  }
};

export const postSetPrimaryBankAccount = async (
  userId: string,
  brandId: string,
  userBankAccountId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/primary-bank-account`,
      { userBankAccountId }
    );
    return response.data;
  } catch (error) {
    console.error("Error setting primary bank account:", error);
    throw error;
  }
};

export const updateUserReloan = async (
  brandId: string,
  userId: string,
  data: {
    id: string; // This is the userReloanId
    status: ReloanStatus; // Ideally ReloanStatus
    reason?: string;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/reloan`,
      {
        id: data.id,
        status: data.status,
        reason: data.reason,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating user reloan:", error);
    throw error;
  }
};

export const uploadProfileMedia = async (
  customerId: string,
  brandId: string,
  formData: FormData
) => {
  try {
    console.log("API call - uploadProfileMedia:", {
      customerId,
      brandId,
      formData: Array.from(formData.entries()),
    });

    const response = await api.post(
      `/partner/brand/${brandId}/customers/${customerId}/upload-profile-media`,
      formData,
      {
        headers: {
          // Remove Content-Type to let axios set multipart/form-data automatically
          "Content-Type": undefined,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          console.log(`Upload Progress: ${percentCompleted}%`);
        },
      }
    );

    console.log("API response received:", response.data);
    return response.data;
  } catch (error) {
    console.error("API Error in uploadProfileMedia:", error);
    throw error;
  }
};

export const addAlternatePhoneNumber = async (
  userId: string,
  brandId: string,
  data: {
    phone: string;
    label: string;
    name: string;
    relationship: string; // RelationshipEnum
    verificationType?: string; // VerificationType
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/alternate-phone-numbers`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error adding alternate phone number:", error);
    throw error;
  }
};

export const verifyAlternatePhoneNumber = async (
  userId: string,
  brandId: string,
  alternatePhoneId: string,
  otp: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/alternate-phone-numbers/${alternatePhoneId}/verify`,
      { otp }
    );
    return response.data;
  } catch (error) {
    console.error("Error verifying alternate phone number:", error);
    throw error;
  }
};

export const resendAlternatePhoneOtp = async (
  userId: string,
  brandId: string,
  alternatePhoneId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/alternate-phone-numbers/${alternatePhoneId}/resend-otp`
    );
    return response.data;
  } catch (error) {
    console.error("Error resending OTP for alternate phone number:", error);
    throw error;
  }
};

export const deleteAlternatePhoneNumber = async (
  userId: string,
  brandId: string,
  alternatePhoneId: string
) => {
  try {
    const response = await api.delete(
      `/partner/brand/${brandId}/customers/${userId}/alternate-phone-numbers/${alternatePhoneId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting alternate phone number:", error);
    throw error;
  }
};

// Skip onboarding step
export const skipOnboardingStep = async (
  userId: string,
  brandId: string,
  stepNumber: number,
  reason?: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/skip-onboarding-step`,
      {
        stepNumber,
        reason: reason || "Manually skipped by partner admin",
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error skipping onboarding step:", error);
    throw error;
  }
};

export const fetchPhoneAgeApi = async (
  phoneNumber: string,
  customerId: string,
  brandId: string
) => {
  // Remove "+91" from the beginning
  const formattedPhoneNumber = phoneNumber.startsWith("+91")
    ? phoneNumber.substring(3)
    : phoneNumber;

  try {
    const response = await api.post(`/kycKart/mobileVerification/mobileAge`, {
      mobileNo: formattedPhoneNumber,
      userId: customerId,
      brandId,
    });

    return response.data?.response?.mobile_age || null;
  } catch (error) {
    console.error("Error fetching phone age:", error);
    throw error;
  }
};

export const fetchEmploymentHistoryApi = async (
  customerId: string,
  brandId: string,
  options?: { cacheOnly?: boolean }
) => {
  try {
    const body: any = { userId: customerId, brandId };
    if (options?.cacheOnly) body.cacheOnly = true;

    // Change from /epfo/employment-history to the new UAN-to-employment endpoint
    const response = await api.post(
      `/partner/brand/${brandId}/uan-to-employment/employment-history`, 
      body
    );

    const data = response.data;

    return data;
  } catch (error) {
    console.error("Error fetching employment history:", error);
    throw error;
  }
};

export const fetchEmploymentHistoryComprehensiveApi = async (
  customerId: string,
  brandId: string,
  mobileNumber?: string
) => {
  try {
    const body: any = { 
      userId: customerId, 
      mobile: mobileNumber || null 
    };

    // Call the new comprehensive fallback endpoint
    const response = await api.post(
      `/partner/brand/${brandId}/uan-to-employment/comprehensive-fallback`, 
      body
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching comprehensive employment history:", error);
    throw error;
  }
};

// Add relocate user function
export const relocateUser = async (
  userId: string,
  newPartnerUserId: string
) => {
  try {
    const response = await api.post("/user/relocate-user", {
      userId,
      newPartnerUserId,
    });
    return response.data;
  } catch (error) {
    console.error("Error relocating user:", error);
    throw error;
  }
};

// Get user status brand reasons
export const getUserStatusBrandReasons = async (brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/brand-rejection-reasons?type=USER`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching user status brand reasons:", error);
    throw error;
  }
};

// Save user status brand reasons
export const saveUserStatusBrandReasons = async (
  brandId: string,
  userId: string,
  brandStatusReasonIds: string[],
  status_id?: bigint | string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/user-status-brand-reasons`,
      { brandStatusReasonIds, status_id: status_id || "1" }
    );
    return response.data;
  } catch (error) {
    console.error("Error saving user status brand reasons:", error);
    throw error;
  }
};

// ==================== Bank Account Management ====================

// Get all bank accounts for a user
export const getAllBankAccounts = async (userId: string, brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/bank-accounts`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    throw error;
  }
};

// Get single bank account by ID
export const getBankAccountById = async (
  userId: string,
  brandId: string,
  bankAccountId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/bank-account/${bankAccountId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching bank account:", error);
    throw error;
  }
};

// Create new bank account
export const createBankAccount = async (
  userId: string,
  brandId: string,
  data: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    bankAddress: string;
    accountType: string;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/bank-accounts`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error creating bank account:", error);
    throw error;
  }
};

// Update existing bank account
export const updateBankAccount = async (
  userId: string,
  brandId: string,
  bankAccountId: string,
  data: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    bankAddress: string;
    accountType: string;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/bank-account/${bankAccountId}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error updating bank account:", error);
    throw error;
  }
};

// Set primary bank account
export const setPrimaryBankAccount = async (
  userId: string,
  brandId: string,
  bankAccountId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/primary-bank-account`,
      { userBankAccountId: bankAccountId }
    );
    return response.data;
  } catch (error) {
    console.error("Error setting primary bank account:", error);
    throw error;
  }
};

// Delete bank account
export const deleteBankAccount = async (
  userId: string,
  brandId: string,
  bankAccountId: string
) => {
  try {
    const response = await api.delete(
      `/partner/brand/${brandId}/customers/${userId}/bank-account/${bankAccountId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting bank account:", error);
    throw error;
  }
};

export const fetchEmploymentHistoryWithAlternatePhoneApi = async (
  userId: string,
  brandId: string,
  mobileNumber: string
) => {
  const response = await api.post("/epfo/employment-history-alternate", {
    userId,
    brandId,
    mobileNumber,
  });
  return response.data;
};

export const verifyMobileWithService = async (
  serviceType: string,
  customerId: string,
  brandId: string
) => {
  const response = await api.post(
    `/partner/mobile-to-addrress-verification/with-service`,
    {
      serviceType,
      userId: customerId,
      brandId,
    }
  );
  return response.data;
};

export const verifyMobileBatch = async (
  customerId: string,
  brandId: string
) => {
  const response = await api.post(
    `/partner/mobile-to-addrress-verification/batch-verify`,
    {
      userId: customerId,
      brandId,
    }
  );
  return response.data;
};

// Generate Aadhaar link
export const generateAadhaarLink = async (
  userId: string,
  brandId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/generate-aadhaar-link`,
      {
        userId: userId,
        brandId: brandId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error generating Aadhaar link:", error);
    throw error;
  }
};

// Get recent DigiLocker URLs
export const getRecentDigiLockerUrls = async (
  userId: string,
  brandId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/recent-digilocker-urls`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching recent DigiLocker URLs:", error);
    throw error;
  }
};


export const fetchEmploymentHistoryByPanApi = async (
  brandId: string,
  userId?: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/uan-to-employment/digitap/pan`,
      {
        userId
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching employment history by PAN:", error);
    throw error;
  }
};

// Fetch employment history using UAN (Digitap)
export const fetchEmploymentHistoryByUanApi = async (
  brandId: string,
  userId?: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/uan-to-employment/digitap/uan`,
      {
        userId
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching employment history by UAN:", error);
    throw error;
  }
};

// Add this to customer.api.ts
export const getCustomerDeviceInfo = async (userId: string, brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/device-info`
    );
    
    // Check if response is the raw device info object
    if (response.data && (response.data.deviceType || response.data.ipAddress)) {
      return {
        success: true,
        data: response.data
      };
    }
    
    // If it's already formatted correctly
    return response.data;
  } catch (error) {
    console.error("Error fetching device info:", error);
    throw error;
  }
};

// Update residence type
export const updateResidenceType = async (
  userId: string,
  brandId: string,
  residenceType: string
) => {
  try {
    const response = await api.patch(
      `/partner/brand/${brandId}/customers/${userId}/update-residence-type`,
      {
        residenceType,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating residence type:", error);
    throw error;
  }
};

// Update gender
export const updateGender = async (
  userId: string,
  brandId: string,
  gender: string
) => {
  try {
    const response = await api.patch(
      `/partner/brand/${brandId}/customers/${userId}/update-gender`,
      {
        gender,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating gender:", error);
    throw error;
  }
};

// Update religion
export const updateReligion = async (
  userId: string,
  brandId: string,
  religion: string
) => {
  try {
    const response = await api.patch(
      `/partner/brand/${brandId}/customers/${userId}/update-religion`,
      {
        religion,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating religion:", error);
    throw error;
  }
};

// Update marital status
export const updateMaritalStatus = async (
  userId: string,
  brandId: string,
  maritalStatus: string
) => {
  try {
    const response = await api.patch(
      `/partner/brand/${brandId}/customers/${userId}/update-marital-status`,
      {
        maritalStatus,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating marital status:", error);
    throw error;
  }
};

// Update date of birth
export const updateDateOfBirth = async (
  userId: string,
  brandId: string,
  dateOfBirth: string
) => {
  try {
    const response = await api.patch(
      `/partner/brand/${brandId}/customers/${userId}/update-date-of-birth`,
      {
        dateOfBirth,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating date of birth:", error);
    throw error;
  }
};

// Update alternate phone 1
export const updateAlternatePhone1 = async (
  userId: string,
  brandId: string,
  alternatePhone1: string
) => {
  try {
    const response = await api.patch(
      `/partner/brand/${brandId}/customers/${userId}/update-alternate-phone-1`,
      {
        alternatePhone1,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating alternate phone 1:", error);
    throw error;
  }
};

// Update alternate phone 2
export const updateAlternatePhone2 = async (
  userId: string,
  brandId: string,
  alternatePhone2: string
) => {
  try {
    const response = await api.patch(
      `/partner/brand/${brandId}/customers/${userId}/update-alternate-phone-2`,
      {
        alternatePhone2,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating alternate phone 2:", error);
    throw error;
  }
};

// ==================== User Salaries Management ====================

// Get all salary records for a user
export const getUserSalaries = async (userId: string, brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/salaries`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching user salaries:", error);
    throw error;
  }
};

// Add a new salary record
export const addUserSalary = async (
  userId: string,
  brandId: string,
  data: {
    salary_amount: number;
    salary_date: string; // YYYY-MM-DD format
    notes?: string;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/${userId}/salaries`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error adding user salary:", error);
    throw error;
  }
};

// Update salary record
export const updateUserSalary = async (
  userId: string,
  brandId: string,
  salaryId: string,
  data: {
    salary_amount: number;
    salary_date: string; // YYYY-MM-DD format
    notes?: string;
  }
) => {
  try {
    const response = await api.patch(
      `/partner/brand/${brandId}/customers/${userId}/salaries/${salaryId}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error updating user salary:", error);
    throw error;
  }
};

// Delete salary record
export const deleteUserSalary = async (
  userId: string,
  brandId: string,
  salaryId: string
) => {
  try {
    const response = await api.delete(
      `/partner/brand/${brandId}/customers/${userId}/salaries/${salaryId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting user salary:", error);
    throw error;
  }
};

// Get unallocated customers (onboardingStep < 12)
export const getUnallocatedCustomers = async (
  brandId: string,
  page: number = 1,
  limit: number = 10,
  search: string = ""
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/unallocated/list?page=${page}&limit=${limit}&search=${encodeURIComponent(
        search
      )}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching unallocated customers:", error);
    throw error;
  }
};

export const allocateCustomersToPartnerUser = async (
  brandId: string,
  customerIds: string[],
  partnerUserId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/customers/unallocated/allocate`,
      {
        customerIds,
        partnerUserId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error allocating customers:", error);
    throw error;
  }
};

// Update the function to not require ipAddress parameter
export async function checkIpAddressAssociation(
  userId: string,
  brandId: string
) {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/customers/${userId}/ip-check`
    );
    return response.data;
  } catch (error) {
    console.error("Error checking IP address association:", error);
    throw error;
  }
}

