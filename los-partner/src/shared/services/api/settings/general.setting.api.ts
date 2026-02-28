import { LoanRiskCategory } from "../../../../features/specificSetting/components/loanRules";
import api from "../../axios";

export const getGeneral = async (brandId: string) => {
  try {
    const response = await api.get(`/partner/brand/${brandId}/settings/brand`);
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

// @Post("update")
export const updateGeneral = async (
  brandId: string,
  name: string,
  logoUrl: string,
  _domain: string, // Domain is read-only and not sent to backend
  defaultLoanRiskCategory: LoanRiskCategory,
  logoFile?: File
) => {
  try {
    const formData = new FormData();
    
    // Add text fields (domain is read-only so we don't send it)
    formData.append('name', name);
    formData.append('defaultLoanRiskCategory', defaultLoanRiskCategory);
    
    // Always send logoUrl (even if empty for file uploads)
    formData.append('logoUrl', logoUrl || '');
    
    // Add logo file if present (backend should prioritize this over logoUrl)
    if (logoFile) {
      formData.append('logo', logoFile);
    }
    
    const response = await api.post(
      `/partner/brand/${brandId}/settings/brand/update`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating general settings:", error);
    throw error;
  }
};

export const getBrandDetails = async (brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/brand/details`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching brand details:", error);
    throw error;
  }
};

export const updateBrandDetails = async (
  brandId: string,
  brandDetails: {
    address: string;
    contactEmail: string;
    contactPhone: string;
    website?: string;
    gstNumber?: string;
    cinNumber?: string;
    rbiRegistrationNo?: string;
    lenderName?: string;
    description?: string;
    title?: string;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/brand/details/update`,
      brandDetails
    );
    return response.data;
  } catch (error) {
    console.error("Error updating brand details:", error);
    throw error;
  }
};

export const getBrandConfig = async (brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/brand/config`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching brand config:", error);
    throw error;
  }
};

export const updateBrandConfig = async (
  brandId: string,
  brandConfig: {
    salaryThresholdAmount: number;
    rejectionDuration: number;
    bankStatementHistoryMonths: number;
    minLoanAmountRequired: number;
    esignFinalCopyRecipients: string;
    esignNotificationEmailList: string;
    esignDocketTitle: string;
    esignExpiryDayCount: number;
    sectionManagerName: string;
    sectionManagerPhoneNumber: string;
    sectionManagerEmail: string;
    sectionManagerAddress: string;
    noDueCopyRecipients: string;
    isAA: boolean;
    isAlternateNumber: boolean;
    loanAgreementVersion: string;
    isCCReminderEmail: boolean;
    ccReminderEmail: string;
    loanAgreementHeader: string;
    loanAgreementFooter: string;
    isTestReminderEmail: boolean;
    isUserReminderEmail: boolean;
    forceEmployment: boolean;
    isAadharImageRequired: boolean;
    isAadhaarNumberRequired: boolean;
    loanNoDueCertificateHeader: string;
    loanNoDueCertificateFooter: string;
    autoAllocationType: string;
    evaluationVersion: string;
    signUpVersion: string;
    loan_ops_version: string;
    fmsBlockStatus: boolean;
    autoGenerateNOC: boolean;
    enable_central_dedup: boolean;
    sunday_off: boolean;
    field_visit: boolean;
    min_age: number;
    max_age: number;
  },
  loanAgreementHeaderFile?: File,
  loanAgreementFooterFile?: File,
  loanNoDueCertificateHeaderFile?: File,
  loanNoDueCertificateFooterFile?: File,
) => {
  try {
    const formData = new FormData();
    
    // Add all text fields
    formData.append('salaryThresholdAmount', String(brandConfig.salaryThresholdAmount));
    formData.append('rejectionDuration', String(brandConfig.rejectionDuration));
    formData.append('bankStatementHistoryMonths', String(brandConfig.bankStatementHistoryMonths));
    formData.append('minLoanAmountRequired', String(brandConfig.minLoanAmountRequired));
    formData.append('esignFinalCopyRecipients', brandConfig.esignFinalCopyRecipients);
    formData.append('esignNotificationEmailList', brandConfig.esignNotificationEmailList);
    formData.append('esignDocketTitle', brandConfig.esignDocketTitle);
    formData.append('esignExpiryDayCount', String(brandConfig.esignExpiryDayCount));
    formData.append('sectionManagerName', brandConfig.sectionManagerName);
    formData.append('sectionManagerPhoneNumber', brandConfig.sectionManagerPhoneNumber);
    formData.append('sectionManagerEmail', brandConfig.sectionManagerEmail);
    formData.append('sectionManagerAddress', brandConfig.sectionManagerAddress);
    formData.append('noDueCopyRecipients', brandConfig.noDueCopyRecipients);
    formData.append('isAA', String(brandConfig.isAA));
    formData.append('isAlternateNumber', String(brandConfig.isAlternateNumber));
    formData.append('loanAgreementVersion', brandConfig.loanAgreementVersion);
    formData.append('isCCReminderEmail', String(brandConfig.isCCReminderEmail));
    formData.append('ccReminderEmail', brandConfig.ccReminderEmail);
    formData.append('loanAgreementHeader', brandConfig.loanAgreementHeader || '');
    formData.append('loanAgreementFooter', brandConfig.loanAgreementFooter || '');
    formData.append('isTestReminderEmail', String(brandConfig.isTestReminderEmail));
    formData.append('isUserReminderEmail', String(brandConfig.isUserReminderEmail));
    formData.append('forceEmployment', String(brandConfig.forceEmployment));
    formData.append('isAadharImageRequired', String(brandConfig.isAadharImageRequired));
    formData.append('isAadhaarNumberRequired', String(brandConfig.isAadhaarNumberRequired));
    formData.append('loanNoDueCertificateHeader', brandConfig.loanNoDueCertificateHeader || '');
    formData.append('loanNoDueCertificateFooter', brandConfig.loanNoDueCertificateFooter || '');
    formData.append('autoAllocationType', brandConfig.autoAllocationType);
    formData.append('evaluationVersion', brandConfig.evaluationVersion);
    formData.append('signUpVersion', brandConfig.signUpVersion);
    formData.append('loan_ops_version', brandConfig.loan_ops_version);
    formData.append('fmsBlockStatus', String(brandConfig.fmsBlockStatus));
    formData.append('autoGenerateNOC', String(brandConfig.autoGenerateNOC))
    formData.append('enable_central_dedup', String(brandConfig.enable_central_dedup));
    formData.append('sunday_off', String(brandConfig.sunday_off));
    formData.append('field_visit', String(brandConfig.field_visit));
    formData.append('min_age', String(brandConfig.min_age));
    formData.append('max_age', String(brandConfig.max_age));
    if (loanAgreementHeaderFile) {
      formData.append('loanAgreementHeaderFile', loanAgreementHeaderFile);
    }
    if (loanAgreementFooterFile) {
      formData.append('loanAgreementFooterFile', loanAgreementFooterFile);
    }
    if (loanNoDueCertificateHeaderFile) {
      formData.append('loanNoDueCertificateHeaderFile', loanNoDueCertificateHeaderFile);
    }
    if (loanNoDueCertificateFooterFile) {
      formData.append('loanNoDueCertificateFooterFile', loanNoDueCertificateFooterFile);
    }
    
    const response = await api.post(
      `/partner/brand/${brandId}/settings/brand/config/update`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating brand config:", error);
    throw error;
  }
};

export const getBrandLoanAgreementConfig = async (brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/brand/loan-agreement-config`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching brand loan agreement config:", error);
    throw error;
  }
};

export const updateBrandLoanAgreementConfig = async (
  brandId: string,
  config: {
    lenderName: string;
    lenderAddress: string;
    nameOfDigitalLendingApplication: string;
    nameOfLendingServiceProvider: string;
    nameOfLoanServiceProviderRecoveryAgent: string;
    sectionManagerName: string;
    sectionManagerAddress: string;
    sectionManagerEmail: string;
    grievanceOfficerName: string;
    grievanceOfficerAddress: string;
    grievanceOfficerEmail: string;
    grievanceOfficerPhone: string;
    sectionManagerPhone: string;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/brand/loan-agreement-config/update`,
      config
    );
    return response.data;
  } catch (error) {
    console.error("Error updating brand loan agreement config:", error);
    throw error;
  }
};
