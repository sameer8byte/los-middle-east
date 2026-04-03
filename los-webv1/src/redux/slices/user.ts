import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { USER_SLICE_LABEL } from "../storeLabels";
import { User } from "../../types/user";
import { RootState } from "../store";
import { OccupationTypeEnum, UserStatusEnum } from "../../constant/enum";

export interface IInitialUserState {
  user: User;
  accessToken: string;
}

export const initialUserState: IInitialUserState = {
  user: {
    id: "",
    email: "",
    phoneNumber: "",
    onboardingStep: 1,
    isEmailVerified: false,
    brandId: "",
    isPhoneVerified: false,
    googleId: "",
    employmentId: "",
    userDetailsId: "",
    userBankAccountId: "",
    signUpVersion: null,
    is_terms_accepted: false,
    status_id: null,
    occupation_type_id: null,
  },
  accessToken: "",
};

export const UserSlice = createSlice({
  name: USER_SLICE_LABEL,
  initialState: initialUserState,
  reducers: {
    updateUserData: (state, action) => {
      return {
        ...state,
        ...action.payload,
      };
    },

    updateUser(state, action: PayloadAction<IInitialUserState["user"]>) {
      state.user = action.payload;
    },
    updateUserOnboardingStep: (state, action: PayloadAction<number>) => {
      state.user.onboardingStep = action.payload;
    },
    updateUserLogout: () => {
      return initialUserState;
    },
    updateUserPhone: (state, action: PayloadAction<string>) => {
      state.user.phoneNumber = action.payload;
    },
    updateUserEmail: (state, action: PayloadAction<string>) => {
      state.user.email = action.payload;
    },
    updateLogout: () => initialUserState,

    updateAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
  },
});

export const {
  updateUserData,
  updateUserLogout,
  updateUserEmail,
  updateUserPhone,
  updateLogout,
  updateUser,
  updateAccessToken,
  updateUserOnboardingStep,
} = UserSlice.actions;

export const selectUserStatus = (state: RootState) => {
  return (
    UserStatusEnum[state.user.user.status_id as keyof typeof UserStatusEnum] ||
    null
  );
};
export const selectUserOccupation = (state: RootState) => {
  return (
    OccupationTypeEnum[
    state.user.user.occupation_type_id as keyof typeof OccupationTypeEnum
    ] || null
  );
};
export const selectUserOnboardingStep = (state: RootState) => {
  return state.user.user.onboardingStep || 1;
};
export const selectUserOccupationType = (state: RootState) => {
  return state.user.user.occupation_type_id || null;
};
export const selectUserStatusId = (state: RootState) => {
  return Number(state.user.user.status_id) || null;
};
