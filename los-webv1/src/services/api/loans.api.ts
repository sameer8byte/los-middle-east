import api from "../axios";

export const getUserLoansCredibility = async (userId: string) => {
  try {
    const response = await api.get(`/loans/user/${userId}/loans-credibility`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user loans credibility:", error);
    throw error;
  }
};

// @Post("user/:userId/calculate-repayment")
export const calculateRepayment = async (
  userId: string,
  data: {
    userId: string;
    requestAmount: number;
    tenureId: string;
  }
) => {
  try {
    const response = await api.post(
      `/loans/user/${userId}/calculate-repayment`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error calculating repayment:", error);
    throw error;
  }
};

// @Post("user/:userId/create-loan")
export const createLoan = async (
  userId: string,
  data: {
    purpose: string;
    userId: string;
    requestAmount: number;
    tenureId: string;
    dueDate: string;
  }
) => {
  try {
    const response = await api.post(`/loans/user/${userId}/create-loan`, data);
    return response.data;
  } catch (error) {
    console.error("Error creating loan:", error);
    throw error;
  }
};

// @Get("user/:userId/get-loan/:loanId")
export const getLoan = async (userId: string, loanId: string) => {
  try {
    const response = await api.get(`/loans/user/${userId}/get-loan/${loanId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching loan:", error);
    throw error;
  }
};

// @Get("user/:userId/get-loans")
export const getLoans = async (userId: string) => {
  try {
    const response = await api.get(`/loans/user/${userId}/get-loans`);
    return response.data;
  } catch (error) {
    console.error("Error fetching loans:", error);
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

// @Post("user/:userId/current-repayment")
export const postCurrentRepayment = async (userId: string, loanId: string) => {
  try {
    const response = await api.post(`/loans/user/${userId}/current-repayment`, {
      userId,
      loanId,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching current repayment:", error);
    throw error;
  }
};

// esign
// @Post("esign/generate-document")
export const generateEsignDocument = async (data: {
  loanId: string;
  userId: string;
}) => {
  try {
    const response = await api.post(`/esign/generate-document`, data);
    return response.data;
  } catch (error) {
    console.error("Error generating esign document:", error);
    throw error;
  }
}; 





