import { RelationshipEnum } from "../../types/document";
import api from "../axios";
export enum document_type_enum {
  AADHAAR = "AADHAAR",
  PAN = "PAN",
}
export interface CreateKycDto {
  type: document_type_enum;
  frontDocumentUrl: string;
  backDocumentUrl: string;
  documentNumber: string;
}

export enum document_status_enum {
  PENDING = "PENDING",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  VERIFICATION_FAILED = "VERIFICATION_FAILED", // e.g., server/API error
}

export interface DigitapData {
  /**
   * OTP if type is AADHAAR
   */
  otp: string;

  /**
   * Transaction ID if type is AADHAAR
   */
  transactionId: string;

  /**
   * Code verifier if type is AADHAAR
   */
  codeVerifier: string;

  /**
   * Forwarded parameter if type is AADHAAR
   */
  fwdp: string;
}
export interface ScoreMeData {
  referenceId: string;
  responseMessage: string;
  responseCode: string;
  otp: string;
}

export interface VerifyAadharKyc {
  userId: string; // UUID of the user
}

export const aadhaarKyc = async (userId: string, data: CreateKycDto) => {
  try {
    const response = await api.post(`/web/kyc/${userId}/aadhaar`, data);
    return response.data;
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};

export const verifyAadharKyc = async (userId: string, brandId: string) => {
  try {
    const response = await api.post(`/web/kyc/${userId}/aadhaar-kyc-verify`, {
      brandId,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};

export const getRecentDigiLockerUrls = async (userId: string, brandId: string) => {
  try {
    const response = await api.post(`/web/kyc/${userId}/aadhaar-kyc-recent-urls`, {
      brandId,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching recent DigiLocker URLs:", error);
    throw error;
  }
};

export const panKyc = async (userId: string, data: CreateKycDto) => {
  try {
    const response = await api.post(`/web/kyc/${userId}/pan`, data);
    return response.data;
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }
};
export const aadhaarVerifyKyc = async (
  userId: string,
  data: VerifyAadharKyc
) => {
  try {
    const response = await api.post(`/web/kyc/${userId}/aadhaar-verify`, data);
    return response.data;
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};

// @Post(":userId/user-bank-account/penny-verify-initiate")
export const verifyUserBankAccount = async (userId: string) => {
  try {
    const response = await api.post(
      `/web/kyc/${userId}/user-bank-account/penny-verify-initiate`
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};

export interface UploadBankStatement {
  fileUrl: string;
  fileName: string;
  fromDate: Date;
  toDate: Date;
  statementType: string;
  pdfPassword?: string;
}

// @Post(":userId/user-bank-account/statement/initiate")
export const userBankAccountStatement = async (
  userId: string,
  body: UploadBankStatement
) => {
  try {
    const response = await api.post(
      `/web/kyc/${userId}/user-bank-account/statement/initiate`,
      body
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};

export const uploadAadhaarDocument = async ({
  userId,
  file,
  documentType,
  documentNumber,
  side,
}: {
  userId: string;
  file: File;
  documentType: string; // must match your `document_type_enum`
  documentNumber: string;
  side: "front" | "back";
}) => {
  const formData = new FormData();
  formData.append("userId", userId);
  formData.append("documentType", documentType);
  formData.append("documentNumber", documentNumber);
  formData.append("side", side);
  formData.append("file", file); // 👈 this is important

  try {
    const response = await api.post(
      `/web/kyc/${userId}/aadhaar-document-upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error uploading Aadhaar document:", error);
    throw error;
  }
};

//   @Post(":userId/alternate-phone-number")
export const initiateAlternatePhoneNumberVerification = async (
  userId: string,
  phone: string,
  label: string,
  relationship: RelationshipEnum,
  name: string
) => {
  try {
    const response = await api.post(
      `/web/kyc/${userId}/alternate-phone-number`,
      { phone, label, name, userId, relationship }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};

// @Post(":userId/alternate-phone-number/verify")
export const verifyAlternatePhoneNumber = async (
  userId: string,
  otp: string,
  id: string
) => {
  try {
    const response = await api.post(
      `/web/kyc/${userId}/alternate-phone-number/verify`,
      { otp, id }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};

//  //manualPanUpload
//  @Post(":userId/manual-pan-upload")
//  @ApiOperation({ summary: "Upload PAN document for manual verification" })
//  @ApiParam({ name: "userId", description: "UUID of the user" })
//  @ApiResponse({
//    status: 200,
//    description: "PAN document uploaded successfully for manual verification",
//  })
//  @ApiResponse({
//    status: 400,
//    description: "Invalid request or PAN already verified/rejected",
//  })
//  @ApiResponse({ status: 404, description: "User not found" })
//  @HttpCode(HttpStatus.OK)
//  async manualPanUpload(
//    @Param("userId") userId: string,
//    @Body() data: {
//      panNumber: string;
//      userId: string;
//      firstName: string;
//      lastName: string;
//      middleName?: string;
//      dateOfBirth: string;
//    }
//  ) {
//    return this.kycService.manualPanUpload({ ...data, userId });
//  }
export const manualPanUpload = async (
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth: string;
  }
) => {
  try {
    const response = await api.post(`/web/kyc/${userId}/manual-pan-upload`, {
      ...data,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading PAN document:", error);
    throw error;
  }
};
