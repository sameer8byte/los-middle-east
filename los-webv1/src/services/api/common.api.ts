// @Controller("common")

import api from "../axios";



export const getAwsSignedUrl = async (key: string) => {
  try {
    const response = await api.get(`/common/signed-url?key=${key}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching required documents:", error);
    throw error;
  }
};
