import { createSlice } from "@reduxjs/toolkit";
import { PARTNER_USER_SLICE_LABEL } from "../storeLabels";
import { PartnerUserRoleEnum, PartnerUserPermissionEnum } from "../../../constant/enum";
import { UserPermission } from "../../types/partnerUser";
 
export interface initialPartnerUserState {
  data: {
    id: string;
    name: string;
    email: string;
    brandId: string | null;
    role: PartnerUserRoleEnum[];
    permissions: PartnerUserPermissionEnum[];
    reportsToId: string | null; // Added reportsToId to the user data
    userPermissions: UserPermission[]; // Optional field for user-specific permissions
  };
  accessToken: string;
}
export const initialAuthState: initialPartnerUserState = {
  data: {
    id: "",
    email: "",
    name: "",
    brandId: null,
    role: [],
    permissions: [],
    reportsToId: null, // Initialize reportsToId as null
    userPermissions: [], // Initialize userPermissions as an empty array
  },
  accessToken: "",
};

export const AuthSlice = createSlice({
  name: PARTNER_USER_SLICE_LABEL,
  initialState: initialAuthState,
  reducers: {
    // ? Update user  partner data
    updatePartnerUserData: (state, action) => {
      state.data = action.payload;
    },
    // ? Update access token
    updateAccessToken: (state, action) => {
      state.accessToken = action.payload;
    },

    // Add your reducers here
  },
});
export const { updatePartnerUserData, updateAccessToken } = AuthSlice.actions;
