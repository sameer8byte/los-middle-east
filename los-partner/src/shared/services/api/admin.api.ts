import api from "../axios";

export const getBrands = async () => {
  try {
    const response = await api.get("/partner/admin/brands");
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};
  