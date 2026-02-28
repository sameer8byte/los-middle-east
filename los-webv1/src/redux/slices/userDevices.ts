import { createSlice } from "@reduxjs/toolkit";
import { USER_DEVICES_SLICE_LABEL } from "../storeLabels";

export interface IInitialDevicesState {
  id?: string;
  brandId: string;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
  deviceId: string;
  deviceType: string;
  os: string;
  appVersion: string;
  fcmToken: string;
  ipAddress: string;
  userAgent: string;
}

export const initialDevicesState: IInitialDevicesState = {
  id: "",
  brandId: "",
  lastActiveAt: "",
  createdAt: "",
  updatedAt: "",
  deviceId: "",
  deviceType: "",
  os: "",
  appVersion: "",
  fcmToken: "",
  ipAddress: "",
  userAgent: "",
};

export const IndexSlice = createSlice({
  name: USER_DEVICES_SLICE_LABEL,
  initialState: initialDevicesState,
  reducers: {
    // ? Update user data
    updateIndexData: (state, action) => {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { updateIndexData } = IndexSlice.actions;
