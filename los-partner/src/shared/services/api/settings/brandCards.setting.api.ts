import api from "../../axios";

export interface BrandCard {
  id: string;
  brandId: string;
  imageUrl: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandCardForm {
  imageUrl?: string;
  title: string;
  description: string;
  imageFile?: File;
}

export const getBrandCards = async (brandId: string): Promise<BrandCard[]> => {
  try {
    const response = await api.get(`/partner/brand/${brandId}/settings/brand-cards`);
    return response.data;
  } catch (error) {
    console.error("Error fetching brand cards:", error);
    throw error;
  }
};

export const createBrandCard = async (
  brandId: string,
  cardData: BrandCardForm
): Promise<BrandCard> => {
  try {
    const formData = new FormData();
    
    // Add text fields
    formData.append('title', cardData.title);
    formData.append('description', cardData.description);
    
    // Always send imageUrl (even if empty for file uploads)
    formData.append('imageUrl', cardData.imageUrl || '');
    
    // Add image file if present (backend should prioritize this over imageUrl)
    if (cardData.imageFile) {
      formData.append('image', cardData.imageFile);
    }
    
    const response = await api.post(
      `/partner/brand/${brandId}/settings/brand-cards`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating brand card:", error);
    throw error;
  }
};

export const updateBrandCard = async (
  brandId: string,
  cardId: string,
  cardData: BrandCardForm
): Promise<BrandCard> => {
  try {
    const formData = new FormData();
    
    // Add text fields
    formData.append('title', cardData.title);
    formData.append('description', cardData.description);
    
    // Always send imageUrl (even if empty for file uploads)
    formData.append('imageUrl', cardData.imageUrl || '');
    
    // Add image file if present (backend should prioritize this over imageUrl)
    if (cardData.imageFile) {
      formData.append('image', cardData.imageFile);
    }
    
    const response = await api.put(
      `/partner/brand/${brandId}/settings/brand-cards/${cardId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating brand card:", error);
    throw error;
  }
};

export const deleteBrandCard = async (
  brandId: string,
  cardId: string
): Promise<void> => {
  try {
    await api.delete(`/partner/brand/${brandId}/settings/brand-cards/${cardId}`);
  } catch (error) {
    console.error("Error deleting brand card:", error);
    throw error;
  }
};
