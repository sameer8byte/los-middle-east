import api from "../../axios";

export async function fetchBrandPaths(brandId: string) {
  const { data } = await api.get(
    `/partner/brand/${brandId}/settings/brand/paths`
  );
  return data;
}

export async function createBrandPath(
  brandId: string,
  path: string,
  label: string,
  icon?: string,
  isActive: boolean = true,
  isDisabled: boolean = false,
  sortIndex?: number
) {
  const { data } = await api.post(
    `/partner/brand/${brandId}/settings/brand/paths`,
    {
      path,
      label,
      icon,
      isActive,
      isDisabled,
      sortIndex,
    }
  );
  return data;
}

export async function updateBrandPath(
  brandId: string,
  id: string,
  updates: {
    path?: string;
    label?: string;
    icon?: string;
    isActive?: boolean;
    isDisabled?: boolean;
    sortIndex?: number;
  }
) {
  const { data } = await api.post(
    `/partner/brand/${brandId}/settings/brand/paths/${id}`,
    {
      ...(updates.path && { path: updates.path }),
      ...(updates.label && { label: updates.label }),
      ...(updates.icon && { icon: updates.icon }),
      ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      ...(updates.isDisabled !== undefined && { isDisabled: updates.isDisabled }),
      ...(updates.sortIndex !== undefined && { sortIndex: updates.sortIndex }),
    }
  );
  return data;
}

export async function deleteBrandPath(brandId: string, id: string) {
  const { data } = await api.delete(
    `/partner/brand/${brandId}/settings/brand/paths/${id}`
  );
  return data;
}

export async function reorderBrandPaths(
  brandId: string,
  paths: { id: string; sortIndex: number }[]
) {
  const { data } = await api.post(
    `/partner/brand/${brandId}/settings/brand/paths/reorder`,
    { paths }
  );
  return data;
}
