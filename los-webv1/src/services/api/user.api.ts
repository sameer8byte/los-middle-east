 import { UserDetails } from "../../types/user-details";
import api from "../axios";

export const getMe = async (userId: string) => {
  try {
    const response = await api.get(`/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

export const userProfile = async (userId: string) => {
  try {
    const response = await api.get(`/user/${userId}/profile`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

export const patchUpdateUserProfile = async (
  userId: string,
  data: UserDetails
) => {
  try {
    const response = await api.patch(`/user/${userId}/profile`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

export const patchUpdateOnboardingStep = async (
  userId: string,
  data:{
    latitude: number;
    longitude: number;
    ipJson:string
  }
) => {
  try {
    const response = await api.patch(`/user/${userId}/onboarding` ,{
      ...data,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating onboarding step:", error);
    throw error;
  }
};
