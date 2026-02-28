import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ALTERNATE_PHONE_NUMBER_SLICE_LABEL } from "../storeLabels";

interface AlternatePhoneNumber {
  id: string;
  userId: string;
  phone: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  isVerified: boolean;
  verifiedAt: string;
  name: string;
  otp: string;
  relationship: string;
}
const IInitialDocumentsState = {
  alternatePhoneNumber: [] as AlternatePhoneNumber[],
};

export const AlternatePhoneNumbersSlice = createSlice({
  name: ALTERNATE_PHONE_NUMBER_SLICE_LABEL,
  initialState: IInitialDocumentsState,
  reducers: {
    upsertAlternatePhoneNumber(
      state,
      action: PayloadAction<AlternatePhoneNumber>
    ) {
      const index = state.alternatePhoneNumber.findIndex(
        (doc) => doc.id === action.payload.id
      );

      if (index !== -1) {
        // Update existing document
        state.alternatePhoneNumber[index] = action.payload;
      } else {
        // Add new document
        state.alternatePhoneNumber.push(action.payload);
      }
    },

    updateAlternatePhoneNumbers(
      state,
      action: PayloadAction<AlternatePhoneNumber[]>
    ) {
      state.alternatePhoneNumber = action.payload;
    },
  },
});

export const {
  upsertAlternatePhoneNumber,
  updateAlternatePhoneNumbers,
} = AlternatePhoneNumbersSlice.actions;
