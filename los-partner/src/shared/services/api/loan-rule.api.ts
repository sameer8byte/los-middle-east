import api from "../axios";
import { LoanRiskCategory } from "../../../constant/enum";

/**
 * Update loan rule type
 * @param brandId - The brand ID
 * @param loanId - The loan ID
 * @param data - The data to update including ruleType and reason
 */
export const changeLoanRuleType = async (
  brandId: string,
  loanId: string,
  data: {
    ruleType: LoanRiskCategory;
    reason: string;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/loans/${loanId}/change-rule-type`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error changing loan rule type:", error);
    throw error;
  }
};
