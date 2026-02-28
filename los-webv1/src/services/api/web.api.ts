// web

import api from "../axios";

// POST
// /api/web/index
// Used to get brand by doma

export const getIndex = async () => {
  try {
    const response = await api.get("/web/home/index");
    return response.data;
  } catch (error) {
    console.error("Error getting brand by domain:", error);
    throw error;
  }
};

// GET
// /api/web/home/document-review/{userId}

export const getDocumentReview = async (userId: string) => {
  try {
    const response = await api.get(`/web/home/document-review/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error getting document review:", error);
    throw error;
  }
};

// GET
// /api/web/home/download-review-pdf/{userId}

export const getDownloadReviewPdf = async (userId: string) => {
  try {
    const response = await api.get(`/web/home/download-review-pdf/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error downloading review PDF:", error);
    throw error;
  }
};

// GET
// /api/web/home/user
export const getUser = async () => {
  try {
    const response = await api.get("/web/home/user");
    return response.data;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
};

// @Get("alternate-phone-numbers/:userId")

export const getAllAlternatePhoneNumbers = async (userId: string) => {
  try {
    const response = await api.get(
      `/web/home/alternate-phone-numbers/${userId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting all alternate phone numbers:", error);
    throw error;
  }
};

export const createCallMeRequest = async (data: {
  userId: string;
  message: string;
  phoneNumber: string;
  isResolved: boolean;
}) => {
  try {
    const response = await api.post("/web/home/call-me-request", data);
    return response.data;
  } catch (error) {
    console.error("Error creating call me request:", error);
    throw error;
  }
};


export const createUtmTracking = async (data: {
  utmSource: string;
  utmMedium: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;

  utmId: string;
  fbclid: string;
  clickid: string;

  userId: string;
  brandId: string;
}) => {
  try {
    const response = await api.post(`/common/${data.brandId}/utm`, data);
    return response.data;
  } catch (error) {
    console.error("Error creating UTM tracking:", error);
    throw error;
  }
};
