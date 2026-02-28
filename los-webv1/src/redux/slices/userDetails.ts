import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { USER_DETAILS_SLICE_LABEL } from "../storeLabels";
import { AddressProofEnum, GenderEnum, ReligionEnum, UserDetails } from "../../types/user-details";

export const initialUserState: Partial<UserDetails> = {
  id: "",
  userId: "",
  firstName: "",
  lastName: "",
  gender: GenderEnum.MALE,
  dateOfBirth: new Date(),
  profilePicUrl: "",
  profileVideoUrl: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  religion:ReligionEnum.HINDUISM,
  filePrivateKey: "",
  addressProofType: AddressProofEnum.GAS_BILL,
  linkedAadhaarNumberByPanPlus: null,
  aadhaarPanLinkedByPanPlus: false,
};

export const UserDetailsSlice = createSlice({
  name: USER_DETAILS_SLICE_LABEL,
  initialState: initialUserState,
  reducers: {
    updateUserDetails(state, action: PayloadAction<UserDetails>) {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { updateUserDetails } = UserDetailsSlice.actions;
