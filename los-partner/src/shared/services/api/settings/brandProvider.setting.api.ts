import { BrandProviderType, BrandProviderName } from "../../../../constant/enum";
import api from "../../axios";

export const getBrandProviders = async (brandId: string, type?: string) => {
  try {
    const params = new URLSearchParams();
    if (type) {
      params.append("type", type);
    }
    
    const response = await api.get(
      `/partner/brand/${brandId}/settings/brand-provider${params.toString() ? '?' + params.toString() : ''}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching brand providers:", error);
    throw error;
  }
};

export const getBrandProvider = async (
  brandId: string,
  providerId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/settings/brand-provider/${providerId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching brand provider:", error);
    throw error;
  }
};

export const createBrandProvider = async (
  brandId: string,
  providerData: {
    type: BrandProviderType;
    provider: BrandProviderName;
    isActive?: boolean;
    isDisabled?: boolean;
    isPrimary?: boolean;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/brand-provider`,
      providerData
    );
    return response.data;
  } catch (error) {
    console.error("Error creating brand provider:", error);
    throw error;
  }
};

export const updateBrandProvider = async (
  brandId: string,
  providerId: string,
  providerData: {
    type?: BrandProviderType;
    provider?: BrandProviderName;
    isActive?: boolean;
    isDisabled?: boolean;
    isPrimary?: boolean;
  }
) => {
  try {
    const response = await api.put(
      `/partner/brand/${brandId}/settings/brand-provider/${providerId}`,
      providerData
    );
    return response.data;
  } catch (error) {
    console.error("Error updating brand provider:", error);
    throw error;
  }
};

export const deleteBrandProvider = async (
  brandId: string,
  providerId: string
) => {
  try {
    const response = await api.delete(
      `/partner/brand/${brandId}/settings/brand-provider/${providerId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting brand provider:", error);
    throw error;
  }
};
