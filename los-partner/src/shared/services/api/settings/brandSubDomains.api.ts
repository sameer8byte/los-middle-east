import api from "../../axios";

export async function fetchBrandSubDomains(brandId: string) {
  const { data } = await api.get(
    `/partner/brand/${brandId}/settings/brand/sub-domains`
  );
  return data;
}

export async function createBrandSubDomain(
  brandId: string, 
  subdomain: string,
  marketingSource?: string,
  isPrimary: boolean = false
) {
  const { data } = await api.post(
    `/partner/brand/${brandId}/settings/brand/sub-domains`,
    {
      subdomain,
      brandId,
      marketingSource,
      isPrimary
    }
  );
  return data;
}

export async function updateBrandSubDomain(
  brandId: string,
  id: string,
  subdomain: string,
  marketingSource?: string,
  isPrimary?: boolean
) {
  const { data } = await api.post(
    `/partner/brand/${brandId}/settings/brand/sub-domains/${id}`,
    {
      subdomain,
      id,
      marketingSource,
      ...(typeof isPrimary !== 'undefined' && { isPrimary })
    }
  );
  return data;
}

export async function deleteBrandSubDomain(brandId: string, id: string) {
  const response = await api.post(
    `/partner/brand/${brandId}/settings/brand/sub-domains/${id}/delete`
  );
  return response.data;
}

export async function toggleBrandSubDomainDisabled(
  brandId: string,
  id: string,
  isDisabled: boolean
) {
  const { data } = await api.post(
    `/partner/brand/${brandId}/settings/brand/sub-domains/${id}`,
    {
      id,
      isDisabled
    }
  );
  return data;
}
