import api from "../axios";

export const getEquifixBreReport = async (userId: string) => {
  try {
    // Use the correct endpoint as per backend controller: /bre/equifax
    const response = await api.post(`/bre/equifax`, {
      userId,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching Equifax BRE data:", error);
    throw error;
  }
};



// @ApiTags("BRE")
// @AuthType("partner")
// @Controller("bre/cirProV2")
export const getBreCirProV2Report = async (brandId: string, userId: string) => {
  try {
    const response = await api.post(`/bre/cirProV2`, {
      brandId,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching BRE CIRPRO V2 data:", error);
    throw error;
  }
};

export const getBureauLoanSummary = async (brandId: string, userId: string) => {
  const response = await api.get(`/partner/brand/${brandId}/customers/${userId}/bureau-summary`);
  return response.data;
};  