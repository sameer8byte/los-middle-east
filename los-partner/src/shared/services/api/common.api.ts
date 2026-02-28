import api from "../axios";

// GET: /common/signed-url?key=xyz
export const getAwsSignedUrl = async (key: string) => {
  try {
    const response = await api.get(`/common/signed-url`, {
      params: { key },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching signed URL:", error);
    throw error;
  }
};

// POST: /common/reset
export const postResetUser = async ({
  brandId,
  email,
}: {
  brandId: string;
  email: string;
}) => {
  try {
    const response = await api.post(`/common/reset`, {
      brandId,
      email,
    });
    return response.data;
  } catch (error) {
    console.error("Error resetting user:", error);
    throw error;
  }
};

// GET: /common/:brandId/call-me-requests?userId=xyz
export const getCallMeRequests = async ( brandId: string,userId?: string,) => {
  try {
    const response = await api.get(`/common/${brandId}/call-me-requests?${userId ? `userId=${userId}` : ''}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching call me requests:", error);
    throw error;
  }
};

// POST: /common/:brandId/call-me-requests
export const postCallMeRequest = async (
  brandId: string,
  data: {
    userId: string;
    message: string;
    phoneNumber: string;
    isResolved: boolean;
  }
) => {
  try {
    const response = await api.post(`/common/${brandId}/call-me-requests`, data);
    return response.data;
  } catch (error) {
    console.error("Error posting call me request:", error);
    throw error;
  }
};

// PATCH: /common/:brandId/call-me-requests/:callMeRequestId
export const updateCallMeRequest = async (
  brandId: string,
  callMeRequestId: string,
  isResolved: boolean
) => {
  try {
    const response = await api.patch(
      `/common/${brandId}/call-me-requests/${callMeRequestId}`,
      { 
        callMeRequestId: callMeRequestId,
        isResolved }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating call me request:", error);
    throw error;
  }
};
