import { PaymentMethod } from "../../constant/enum";
import api from "../axios";

export const createPayment = async (
  loanId: string,
  userId: string,
  method: PaymentMethod,
) => {
  try {
    const response = await api.post("/payment/create", {
      loanId,
      userId,
      method,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};

export const postCurrentPartialRepayment = async (
  userId: string,
  loanId: string,
  amount: number,
  repaymentDate: string,
  isFinalPaymentPart: boolean = false,
  discountAmount?: number,
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
        discountAmount,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching current partial repayment:", error);
    throw error;
  }
};

//payment/paytring/callback"
export const postPaytringCallback = async (payload: any) => {
  try {
    const response = await api.post("/payment/paytring/callback", payload);
    return response.data;
  } catch (error) {
    console.error("Error posting Paytring callback:", error);
    throw error;
  }
};
export const initiateLoanInquiry = async (identifier: string, type: string) => {
  try {
    const response = await api.post("/payment/public/loan-inquiry/initiate", {
      pan: type === "PAN" ? identifier : undefined,
      mobile: type === "MOBILE" ? identifier : undefined,
    });
    return response.data;
  } catch (error) {
    console.error("Error initiating loan inquiry:", error);
    throw error;
  }
};

export const verifyLoanInquiry = async (
  publicLoanInquiriesId: string,
  otp: string,
  identifier: string,
) => {
  try {
    const response = await api.post("/payment/public/loan-inquiry/verify", {
      publicLoanInquiriesId,
      otp,
      identifier,
    });
    return response.data;
  } catch (error) {
    console.error("Error verifying loan inquiry:", error);
    throw error;
  }
};

export const postLoanRepayment = async (
  publicLoanInquiriesId: string,
  otp: string,
  loanId: string
) => {      
  try { 
    const response = await api.post("/payment/public/loan-inquiry/repayment", {
      publicLoanInquiriesId,
      otp,
      loanId,
    });
    return response.data;
  }
  catch (error) {
    console.error("Error posting loan repayment:", error);
    throw error;
  }
}


      // const response = await fetch(
      //   `${API_BASE_URL}/payment/public/loan-inquiry/create-payment`,
      //   {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       publicLoanInquiriesId: inquiry.publicLoanInquiriesId,
      //       otp: inquiry.otp,
      //       loanId: inquiry.selectedLoan?.id,
      //       method,
      //     }),
      //   },
      // );
      export const createPaymentForLoanInquiry = async (
        publicLoanInquiriesId: string,
        otp: string,      
        loanId: string,   
        method: PaymentMethod
      ) => {
        try {
          const response = await api.post("/payment/public/loan-inquiry/create-payment", {
            publicLoanInquiriesId,
            otp,
            loanId,
            method,
          });
          return response.data;
        }
        catch (error) {
          console.error("Error creating payment for loan inquiry:", error);
          throw error;
        }
      }

    