
import api from "../../axios";

export const getBrandPolicy = async (brandId: string) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/brand-policy-links`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};


export const upsertBrandPolicy = async (
  brandId: string,
  policyLinks: {
    termsConditionUrl: string;
    privacyPolicyUrl: string;
    faqUrl: string;
    brandloanDetailsPolicyUrl:string;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/brand-policy-links/upsert`,
      policyLinks
    );
    return response.data;
  } catch (error) {
    console.error("Error upserting brand policy links:", error);
    throw error;
  }
};