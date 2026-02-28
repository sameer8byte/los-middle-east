import api from "../../axios";

export enum EvaluationStage {
  ONE = "ONE",
  TWO = "TWO",
  THREE = "THREE",
  FOUR = "FOUR",
}

export interface BrandEvaluationItem {
  id: string;
  brandId: string;
  parameter: string;
  requiredValue: string;
  sources: string[];
  stage: EvaluationStage;
  isActive: boolean;
  priority: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandEvaluationItemForm {
  parameter: string;
  requiredValue: string;
  sources: string[];
  stage?: EvaluationStage;
  isActive?: boolean;
  priority?: number;
  description?: string;
}

export interface BrandEvaluationItemsQuery {
  stage?: EvaluationStage;
  isActive?: boolean;
  parameter?: string;
}

export interface BulkUploadResult {
  success: boolean;
  created: number;
  skipped: number;
  errors: number;
  details: {
    createdItems: BrandEvaluationItem[];
    skippedItems: string[];
    errors: string[];
  };
}

export const getBrandEvaluationItems = async (
  brandId: string,
  query?: BrandEvaluationItemsQuery
): Promise<BrandEvaluationItem[]> => {
  try {
    const params = new URLSearchParams();
    if (query?.stage) params.append('stage', query.stage);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());
    if (query?.parameter) params.append('parameter', query.parameter);

    const queryString = params.toString();
    const url = `/partner/brand/${brandId}/settings/brand-evaluation-items${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching brand evaluation items:", error);
    throw error;
  }
};

export const getBrandEvaluationItem = async (
  brandId: string,
  itemId: string
): Promise<BrandEvaluationItem> => {
  try {
    const response = await api.get(`/partner/brand/${brandId}/settings/brand-evaluation-items/${itemId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching brand evaluation item:", error);
    throw error;
  }
};

export const createBrandEvaluationItem = async (
  brandId: string,
  itemData: BrandEvaluationItemForm
): Promise<BrandEvaluationItem> => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/brand-evaluation-items`,
      itemData
    );
    return response.data;
  } catch (error) {
    console.error("Error creating brand evaluation item:", error);
    throw error;
  }
};

export const updateBrandEvaluationItem = async (
  brandId: string,
  itemId: string,
  itemData: Partial<BrandEvaluationItemForm>
): Promise<BrandEvaluationItem> => {
  try {
    const response = await api.put(
      `/partner/brand/${brandId}/settings/brand-evaluation-items/${itemId}`,
      itemData
    );
    return response.data;
  } catch (error) {
    console.error("Error updating brand evaluation item:", error);
    throw error;
  }
};

export const deleteBrandEvaluationItem = async (
  brandId: string,
  itemId: string
): Promise<void> => {
  try {
    await api.delete(`/partner/brand/${brandId}/settings/brand-evaluation-items/${itemId}`);
  } catch (error) {
    console.error("Error deleting brand evaluation item:", error);
    throw error;
  }
};

export const bulkUploadFromCsv = async (
  brandId: string,
  csvFile: File
): Promise<BulkUploadResult> => {
  try {
    const formData = new FormData();
    formData.append('file', csvFile);
    
    const response = await api.post(
      `/partner/brand/${brandId}/settings/brand-evaluation-items/bulk-upload/csv`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading CSV:", error);
    throw error;
  }
};

export const bulkUploadFromJson = async (
  brandId: string,
  items: BrandEvaluationItemForm[]
): Promise<BulkUploadResult> => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/settings/brand-evaluation-items/bulk-upload/json`,
      { items }
    );
    return response.data;
  } catch (error) {
    console.error("Error bulk uploading from JSON:", error);
    throw error;
  }
};
