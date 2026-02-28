import api from "../../axios";

export type RejectionType = "USER" | "LOAN";
export type BrandStatusType = "APPROVED" | "REJECTED" | "HOLD" | "ACTIVE" | "PENDING";

export interface BrandRejectionReason {
  id: string;
  brandId: string;
  reason: string;
  type: RejectionType;
  status: BrandStatusType;
  isDisabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandRejectionReasonInput {
  reason: string;
  type: RejectionType;
  status?: BrandStatusType;
  isDisabled?: boolean;
  isActive?: boolean;
}

export interface UpdateBrandRejectionReasonInput {
  reason?: string;
  type?: RejectionType;
  status?: BrandStatusType;
  isDisabled?: boolean;
  isActive?: boolean;
}

export class BrandRejectionReasonApi {
  static async create(
    brandId: string,
    input: CreateBrandRejectionReasonInput
  ): Promise<BrandRejectionReason> {
    const { data } = await api.post(
      `/partner/brand/${brandId}/settings/brand-rejection-reasons`,
      { ...input, brandId }
    );
    return data;
  }

  static async getAll(brandId: string): Promise<BrandRejectionReason[]> {
    const { data } = await api.get(
      `/partner/brand/${brandId}/settings/brand-rejection-reasons`
    );
    return data;
  }

  static async getById(
    brandId: string,
    id: string
  ): Promise<BrandRejectionReason> {
    const { data } = await api.get(
      `/partner/brand/${brandId}/settings/brand-rejection-reasons/${id}`
    );
    return data;
  }

  static async update(
    brandId: string,
    id: string,
    input: UpdateBrandRejectionReasonInput
  ): Promise<BrandRejectionReason> {
    const { data } = await api.patch(
      `/partner/brand/${brandId}/settings/brand-rejection-reasons/${id}`,
      input
    );
    return data;
  }

  static async delete(brandId: string, id: string): Promise<void> {
    await api.delete(
      `/partner/brand/${brandId}/settings/brand-rejection-reasons/${id}`
    );
  }

  static async getLoanRejectionReasons(brandId: string): Promise<BrandRejectionReason[]> {
    const { data } = await api.get(
      `/partner/brand/${brandId}/settings/brand-rejection-reasons?type=LOAN&status=REJECTED`
    );
    return data;
  }
}
