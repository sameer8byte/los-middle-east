import {
  AddressProofEnum,
  AlternateAddress,
  UserDetails,
} from "../../types/user-details";
import api from "../axios";

export const getPersonalDetails = async (id: string) => {
  try {
    const response = await api.get(`/web/personal-details/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching personal details:", error);
    throw error;
  }
};
export const updatePersonalDetails = async (
  id: string,
  details: Partial<UserDetails>
) => {
  try {
    const response = await api.post(`/web/personal-details/${id}`, details);
    return response.data;
  } catch (error) {
    console.error("Error updating personal details:", error);
    throw error;
  }
};
// @Patch("user-details-document-proof")
export const uploadUserDetailsDocumentProof = async (
  userDetailsId: string,
  addressProofType: AddressProofEnum,
  file: File
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userDetailsId", userDetailsId);
  formData.append("addressProofType", addressProofType);

  try {
    const response = await api.patch(
      `/web/personal-details/user-details-document-proof`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading document proof:", error);
    throw error;
  }
};

// @Patch("remove-user-details-document-proof")
export const removeUserDetailsDocumentProof = async (userDetailsId: string) => {
  try {
    const response = await api.patch(
      `/web/personal-details/remove-user-details-document-proof`,
      { userDetailsId }
    );
    return response.data;
  } catch (error) {
    console.error("Error removing document proof:", error);
    throw error;
  }
};

// getAlternateAddress
export const getAlternateAddress = async (userId: string) => {
  try {
    const response = await api.get(
      `/web/personal-details/alternate-address/${userId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching alternate address:", error);
    throw error;
  }
};

// @Patch("alternate-address/:userId")
export const updateAlternateAddress = async (
  userId: string,
  address: Partial<AlternateAddress>
) => {
  try {
    const response = await api.patch(
      `/web/personal-details/alternate-address/${userId}`,
      address
    );
    return response.data;
  } catch (error) {
    console.error("Error updating alternate address:", error);
    throw error;
  }
};

// @Patch("alternate-address-document-proof")
export const updateAlternateAddressDocumentProof = async (
  brandId: string,
  userId: string,

  alternateAddressId: string,
  addressProofType: AddressProofEnum,
  file: File
) => {
  try {
    const response = await api.patch(
      `web/personal-details/alternate-address-document-proof`,
      { brandId,userId, addressProofType, file ,alternateAddressId},
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating alternate address document proof:", error);
    throw error;
  }
};

// @Patch("remove-alternate-address-document-proof")
export const removeAlternateAddressDocumentProof = async (
  alternateAddressId: string
) => {
  try {
    const response = await api.patch(
      `web/personal-details/remove-alternate-address-document-proof`,
      {alternateAddressId}
    );
    return response.data;
  } catch (error) {
    console.error("Error removing alternate address document proof:", error);
    throw error;
  }
};

export const getUserGeoTags = async (userId: string) => {
  try {
    const response = await api.get(
      `/web/personal-details/geo-tags/${userId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching user geo tags:", error);
    throw error;
  }
}

// Update user geolocation
export const updateUserGeolocation = async (
  userDetailsId: string,
  geoLatitude: number,
  geoLongitude: number
) => {
  try {
    const response = await api.post(
      `/web/personal-details/geolocation/${userDetailsId}`,
      {
        geoLatitude,
        geoLongitude,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating user geolocation:", error);
    throw error;
  }
}
