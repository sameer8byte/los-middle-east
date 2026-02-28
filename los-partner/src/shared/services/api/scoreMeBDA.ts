import api from "../axios";
export interface BdaInitiateResponse {
  id: string;
  userId: string;
  brandId: string;
  referenceId: string;
  jsonUrl: string | null;
  excelUrl: string | null;
  generatedMonth: string;
  bdaReportXlsxPrivateKey: string | null;
  status:
  | "initilization_in_progress"
  | "otp_verification_in_progress"
  | "report_generation_in_progress";
}

export const initiateRetailBdaRequest = async (
  userId: string,
  body: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    address?: string;
    state?: string;
    pincode?: string;
    city?: string;
    mobileNumber?: string;
    panNumber?: string;
    dateOfBirth?: string;
  }
): Promise<BdaInitiateResponse> => {
  try {
    const response = await api.post(`/scoreme-bda/initiate-retail/${userId}`, {
      firstName: body?.firstName || "",
      middleName: body?.middleName || "",
      lastName: body?.lastName || "",
      address: body?.address || "",
      state: body?.state || "",
      pincode: body?.pincode || "",
      city: body?.city || "",
      mobileNumber:`+91${body?.mobileNumber || ""}`,
      panNumber: body?.panNumber || "",
      dateOfBirth: body?.dateOfBirth || "",
    });
    return response.data;
  } catch (error) {
    console.error("Error initiating BDA request:", error);
    throw error;
  }
};

export const validateBdaOtp = async (
  referenceId: string,
  otp: string
): Promise<BdaInitiateResponse> => {
  try {
    const response = await api.post(`/scoreme-bda/validate-otp`, {
      referenceId,
      otp,
    });
    return response.data;
  } catch (error) {
    console.error("Error validating BDA OTP:", error);
    throw error;
  }
};

export const getBdaReport = async (
  referenceId: string
): Promise<BdaInitiateResponse> => {
  try {
    const response = await api.get(`/scoreme-bda/report/${referenceId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching BDA report:", error);
    throw error;
  }
};
