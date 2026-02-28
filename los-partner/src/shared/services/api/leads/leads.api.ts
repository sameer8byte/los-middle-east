import api from "../../axios";

export interface LeadForm {
  id: string;
  brandId?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  city?: string;
  platform?: string;
  isOrganic?: boolean;
  status: 'PENDING' | 'PROCESSED' | 'FAILED' | 'DUPLICATE';
  createdAt: string;
  updatedAt?: string;
  
  // Campaign fields
  createdTime?: string;
  adId?: string;
  adName?: string;
  adsetId?: string;
  adsetName?: string;
  campaignId?: string;
  campaignName?: string;
  formId?: string;
  formName?: string;
  
  // Lead form responses
  areYouASalariedEmployee?: string;
  whatIsYourMonthlySalary?: string;
  enterYourPanNo?: string;
  
  // Address information
  streetAddress?: string;
  
  // System fields
  uploadedAt?: string;
  processedAt?: string;
  errorMessage?: string;
  
  // Legacy field mappings for compatibility
  monthlySalary?: string;
  panNumber?: string;
  isSalariedEmployee?: boolean;
}

export interface LeadFormsStats {
  total: number;
  pending: number;
  processed: number;
  failed: number;
  duplicates?: number;
}

export interface UploadResult {
  message: string;
  totalRows: number;
  processedRows: number;
  errors?: string[];
}

export interface SyncResult {
  processed: number;
  failed: number;
  duplicates: number;
  errors: string[];
}

export interface LeadFormsResponse {
  data: LeadForm[];
  total: number;
  page: number;
  limit: number;
}

// Upload CSV file with lead forms
export const uploadLeadFormsCsv = async (
  brandId: string,
  file: File
): Promise<UploadResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
      `/partner/brand/${brandId}/lead-forms/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading CSV file:", error);
    throw error;
  }
};

// Get all lead forms for a brand
export const getLeadForms = async (
  brandId: string,
  params?: { page?: number; limit?: number; search?: string; status?: string }
): Promise<LeadFormsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const queryString = queryParams.toString();
    let url = `/partner/brand/${brandId}/lead-forms`;
    if (queryString) {
      url += `?${queryString}`;
    }
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching lead forms:", error);
    throw error;
  }
};

// Get lead forms statistics
export const getLeadFormsStats = async (brandId: string): Promise<LeadFormsStats> => {
  try {
    const response = await api.get(`/partner/brand/${brandId}/lead-forms/stats`);
    return response.data;
  } catch (error) {
    console.error("Error fetching lead forms stats:", error);
    throw error;
  }
};

// Sync lead forms to database
export const syncLeadForms = async (brandId: string): Promise<SyncResult> => {
  try {
    const response = await api.post(`/partner/brand/${brandId}/lead-forms/sync`);
    return response.data;
  } catch (error) {
    console.error("Error syncing lead forms:", error);
    throw error;
  }
};

// Delete lead forms in bulk
export const deleteLeadForms = async (
  brandId: string,
  ids: string[]
): Promise<void> => {
  try {
    await api.delete(`/partner/brand/${brandId}/lead-forms/bulk`, {
      data: { ids }
    });
  } catch (error) {
    console.error("Error deleting lead forms:", error);
    throw error;
  }
};

// Delete a single lead form
export const deleteLeadForm = async (
  brandId: string,
  id: string
): Promise<void> => {
  try {
    await deleteLeadForms(brandId, [id]);
  } catch (error) {
    console.error("Error deleting lead form:", error);
    throw error;
  }
};

// Get a specific lead form by ID
export const getLeadFormById = async (
  brandId: string,
  id: string
): Promise<LeadForm> => {
  try {
    const response = await api.get(`/partner/brand/${brandId}/lead-forms/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching lead form:", error);
    throw error;
  }
};

// Update lead form status
export const updateLeadFormStatus = async (
  brandId: string,
  id: string,
  status: LeadForm['status']
): Promise<LeadForm> => {
  try {
    const response = await api.patch(
      `/partner/brand/${brandId}/lead-forms/${id}/status`,
      { status }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating lead form status:", error);
    throw error;
  }
};

// Export lead forms as CSV
export const exportLeadFormsCsv = async (
  brandId: string,
  filters?: {
    status?: LeadForm['status'];
    platform?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<Blob> => {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.platform) params.append('platform', filters.platform);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

    const response = await api.get(
      `/partner/brand/${brandId}/lead-forms/export?${params.toString()}`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error exporting lead forms:", error);
    throw error;
  }
};

// Legacy class-based API service for backward compatibility
export class LeadsApiService {
  static async uploadCsv(brandId: string, file: File): Promise<UploadResult> {
    return uploadLeadFormsCsv(brandId, file);
  }

  static async getAll(
    brandId: string, 
    params?: { page?: number; limit?: number; search?: string; status?: string }
  ): Promise<LeadFormsResponse> {
    return getLeadForms(brandId, params);
  }

  static async getStats(brandId: string): Promise<LeadFormsStats> {
    return getLeadFormsStats(brandId);
  }

  static async sync(brandId: string): Promise<SyncResult> {
    return syncLeadForms(brandId);
  }

  static async deleteBulk(brandId: string, ids: string[]): Promise<void> {
    return deleteLeadForms(brandId, ids);
  }

  static async deleteOne(brandId: string, id: string): Promise<void> {
    return deleteLeadForm(brandId, id);
  }

  static async getById(brandId: string, id: string): Promise<LeadForm> {
    return getLeadFormById(brandId, id);
  }

  static async updateStatus(
    brandId: string,
    id: string,
    status: LeadForm['status']
  ): Promise<LeadForm> {
    return updateLeadFormStatus(brandId, id, status);
  }

  static async exportCsv(
    brandId: string,
    filters?: {
      status?: LeadForm['status'];
      platform?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<Blob> {
    return exportLeadFormsCsv(brandId, filters);
  }
}