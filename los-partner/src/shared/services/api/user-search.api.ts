import api from "../axios";

export interface UserSearchResult {
  id: string;
  email: string;
  phoneNumber: string;
  formattedUserId: string;
  createdAt: string;
  userDetails: {
    firstName: string;
    middleName: string;
    lastName: string;
  } | null;
  allottedPartner: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export const searchUserByFormattedId = async (
  brandId: string,
  formattedUserId: string
): Promise<UserSearchResult> => {
  const response = await api.get(
    `/partner/brand/${brandId}/customers/search/${encodeURIComponent(formattedUserId)}`
  );
  
  return response.data;
};
