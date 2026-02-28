import { BrandProviderName } from "../../../constant/enum";
import api from "../axios";

export const getAgreements = async (loanAgreementId: string) => {
  try {
    const agreements = await api.get(`/esign/agreement?loanAgreementId=${loanAgreementId}`);
    return agreements.data
  } catch (error) {
    console.error("Error fetching agreements", error);
    throw error;
  }
};

export const getAgreementDetails = async (loanAgreementId: string) => {
  try {
    const response = await api.get(
      `/esign/agreement-details?loanAgreementId=${loanAgreementId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching agreement details", error);
    throw error;
  }
};

export const sendDocumentForSigning = async (
  userId: string,
  agreementId: string,
  provider: BrandProviderName |null
) => {
  try {
    const response = await api.post("/esign/send-document", {
      userId,
      agreementId,
      provider,
    });
    return response.data;
  } catch (error) {
    console.error("Error sending document for signing", error);
    throw error;
  }
};


// http://localhost:4002/api/v1/esign/sync-agreement-status:Post
export const syncAgreementStatus = async (brandId: string) => {
  try {
    const response = await api.post("/esign/sync-agreement-status", {
      brandId,
    });
    return response.data;
  } catch (error) {
    console.error("Error syncing agreement status", error);
    throw error;
  }
}

export const resetAgreementStatus = async (loanAgreementId: string) => {
  try {
    const response = await api.post("/esign/reset-agreement-status", {
      loanAgreementId,
    });
    return response.data;
  } catch (error) {
    console.error("Error resetting agreement status", error);
    throw error;
  }
};

export const getESignedDocument = async (loanId: string) => {
  try {
    const response = await api.get(`/esign/signed-document?loanId=${loanId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching e-signed document", error);
    throw error;
  }
};