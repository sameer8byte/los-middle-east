import api from "../axios";
// enum: ['AADHAAR', 'PAN', 'PASSPORT' ,'BANK_STATEMENT',"SALARY_SLIP","OTHER"],
export enum document_type_enum {
  AADHAAR = "AADHAAR",
  PAN = "PAN",
  PASSPORT = "PASSPORT",
  BANK_STATEMENT = "BANK_STATEMENT",
  SALARY_SLIP = "SALARY_SLIP",
  OTHER = "OTHER",
}

export const uploadFile = async (
  file: File,
  documentType: document_type_enum,
  userId: string
) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    formData.append("userId", userId);

    const response = await api.post("/aws-s3/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

export const getFileAccess = async (key: string) => {
  try {
    const response = await api.get(`/aws-s3/${key}/access`);
    return response.data;
  } catch (error) {
    console.error("Error fetching file access:", error);
    throw error;
  }
};

export const uploadPublicFile = async (
  file: File,
  brandId: string,
  userId: string
) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("brandId", brandId);

    const response = await api.post("/aws-s3/upload-public", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};
