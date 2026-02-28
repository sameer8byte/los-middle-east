import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { USER_GEO_LOCATION_SLICE_LABEL } from "../storeLabels";

export interface UserGeoLocation {
  id: string;
  userId: string;
  address: string;
  city: string;
  country: string;
  district: string;
  latitude: number;
  longitude: number;
  notes: string;
  postalCode: string;
  state: string;
  street: string;
  sublocality: string;
  createdAt: string;
}

export const initialUserGeoLocationState: Partial<UserGeoLocation> = {
  id: "",
  userId: "",
  address: "",
  city: "",
  country: "",
  district: "",
  latitude: 0,
  longitude: 0,
  notes: "",
  postalCode: "",
  state: "",
  street: "",
  sublocality: "",
  createdAt: "",
};

export const UserGeoLocationSlice = createSlice({
  name: USER_GEO_LOCATION_SLICE_LABEL,
  initialState: initialUserGeoLocationState,
  reducers: {
    updateUserGeoLocation(state, action: PayloadAction<UserGeoLocation>) {
      return {
        ...state,
        ...action.payload,
      };
    },
    clearUserGeoLocation() {
      return initialUserGeoLocationState;
    },
    updateUserCoordinates(state, action: PayloadAction<{ latitude: number; longitude: number }>) {
      return {
        ...state,
        latitude: action.payload.latitude,
        longitude: action.payload.longitude,
      };
    },
    updateUserAddress(state, action: PayloadAction<Partial<Pick<UserGeoLocation, 'address' | 'city' | 'state' | 'postalCode' | 'country'>>>) {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { 
  updateUserGeoLocation, 
  clearUserGeoLocation, 
  updateUserCoordinates, 
  updateUserAddress 
} = UserGeoLocationSlice.actions;
