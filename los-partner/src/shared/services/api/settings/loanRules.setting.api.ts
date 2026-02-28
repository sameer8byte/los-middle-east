import { LoanRiskCategory } from "../../../../constant/enum";
import api from "../../axios";

export const getLoanRules = async (brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/loan-rules`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const getLoanRule = async (brandId: string, loanId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/loan-rules/${loanId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const patchLoanRules = async (
  brandId: string,
  body: {
    id: string | null; // Optional field, if not provided a new rule will be created
    isActive: boolean;
    maxAmount: number;
    minAmount: number;
    ruleType: LoanRiskCategory; // Assuming ruleType is a string
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/loan-rules`,
      body
    );
    return response.data;
  } catch (error) {
    console.error("Error patching loan rules:", error);
    throw error;
  }
};

export const getTenuresByRuleId = async (
  brandId: string,
  loanRuleId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/loan-rules/tenures?loanRuleId=${loanRuleId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting tenures by rule ID:", error);
    throw error;
  }
};

export const getPenaltiesByTenureId = async (
  brandId: string,
  loanRuleId: string,
  tenureId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/loan-rules/penalties?loanRuleId=${loanRuleId}&tenureId=${tenureId}`
    );
    return response.data;
  } catch (error) {   
    console.error("Error getting penalties by tenure ID:", error);
    throw error;
  }
};

export const getTenures = async (brandId: string,
  loanRuleId: string = "" // Default to empty string if no rule ID is provided
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/loan-rules/tenures?loanRuleId=${loanRuleId}` // Assuming you want all tenures
    );
    return response.data;
  } catch (error) {
    console.error("Error getting tenures:", error);
    throw error;
  }
};

export const patchLoanRuleTenures = async (brandId: string, body: {
  id: string | null; // Optional field, if not provided a new tenure will be created
  loanRuleId: string;
  maxTermDays: number; // Assuming this is a new field added
  minTermDays: number;
  minPostActiveTermDays: number;
  allowPrepayment: boolean;
  gracePeriod: number; // in days
  isActive: boolean;
  loan_type: string; // Assuming this is a string, you can change it to an enum if needed
}) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/loan-rules/loan-rule-tenures`,
      body
    );
    return response.data;
  } catch (error) {
    console.error("Error patching loan rule tenures:", error);
    throw error;
  }
};

export const patchLoanPenalty = async (brandId: string, body: any) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/loan-rules/loan-penalty`,
      body
    );
    return response.data;
  } catch (error) {
    console.error("Error patching loan penalty:", error);
    throw error;
  }
};

export const patchLoanChargeConfig = async (brandId: string, body: any) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/loan-rules/loan-charge-config`,
      body
    );
    return response.data;
  } catch (error) {
    console.error("Error patching loan charge config:", error);
    throw error;
  }
};

export const patchLoanChargeTaxes = async (brandId: string, body: any) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/loan-rules/loan-charge-taxes`,
      body
    );
    return response.data;
  } catch (error) {
    console.error("Error patching loan charge taxes:", error);
    throw error;
  }
};
