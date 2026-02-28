import api from "../axios";

export interface SaveCAMCalculatorRequest {
  loanId: string;
  userId: string;
  partnerUserId: string;
  salaryCreditDate1?: string;
  salaryCreditDate2?: string;
  salaryCreditDate3?: string;
  salaryAmount1?: number;
  salaryAmount2?: number;
  salaryAmount3?: number;
  nextPayDate?: string;
  salaryVariance?: number;
  actualSalary?: number;
  eligibleFoir?: number;
  loanApplied?: number;
  eligibleLoan?: number;
  loanRecommended?: number;
  disbursalDate?: string;
  repayDate?: string;
  tenure?: string;
  tenureId?: string;
  avgSalary?: number;
  foirAchieved?: number;
  proposedFoir?: number;
  roi?: number;
  obligations?: number;
  repaymentData?: any;
}

export interface CAMCalculatorResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export async function saveCAMCalculator(
  brandId: string,
  data: SaveCAMCalculatorRequest
): Promise<CAMCalculatorResponse> {
  const response = await api.post(
    `/loans/brand/${brandId}/cam-calculator/save`,
    data
  );
  return response.data;
}

export async function getCAMCalculator(
  loanId: string
): Promise<CAMCalculatorResponse> {
  const response = await api.get(`/loans/cam-calculator/${loanId}`);
  return response.data;
}

export async function getCAMCalculatorByUser(
  userId: string,
  brandId: string
): Promise<CAMCalculatorResponse> {
  const response = await api.get(
    `/loans/user/${userId}/brand/${brandId}/cam-calculators`
  );
  return response.data;
}

export async function deleteCAMCalculator(
  loanId: string
): Promise<CAMCalculatorResponse> {
  const response = await api.delete(`/loans/cam-calculator/${loanId}`);
  return response.data;
}
