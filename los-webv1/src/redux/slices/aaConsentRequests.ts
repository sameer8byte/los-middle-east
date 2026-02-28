import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AA_CONSENT_REQUESTS_SLICE_LABEL } from "../storeLabels";
import {
  AAConsentRequest,
  AAConsentRequestState,
  AAConsentStatus,
} from "../../types/aa-consent-request";

export const initialAAConsentRequestState: AAConsentRequestState = {
  consentRequests: [],
  currentConsentRequest: undefined,
  loading: false,
  error: undefined,
};

export const AAConsentRequestSlice = createSlice({
  name: AA_CONSENT_REQUESTS_SLICE_LABEL,
  initialState: initialAAConsentRequestState,
  reducers: {
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Set error message
    setError: (state, action: PayloadAction<string | undefined>) => {
      state.error = action.payload;
    },

    // Update all consent requests
    setConsentRequests: (state, action: PayloadAction<AAConsentRequest[]>) => {
      state.consentRequests = action.payload;
    },

    // Add a new consent request
    addConsentRequest: (state, action: PayloadAction<AAConsentRequest>) => {
      state.consentRequests.push(action.payload);
    },

    // Update a specific consent request
    updateConsentRequest: (state, action: PayloadAction<AAConsentRequest>) => {
      const index = state.consentRequests.findIndex(
        (request) => request.id === action.payload.id
      );
      if (index !== -1) {
        state.consentRequests[index] = action.payload;
      }
    },

    // Update consent request status
    updateConsentRequestStatus: (
      state,
      action: PayloadAction<{ id: string; status: AAConsentStatus }>
    ) => {
      const index = state.consentRequests.findIndex(
        (request) => request.id === action.payload.id
      );
      if (index !== -1) {
        state.consentRequests[index].consentStatus = action.payload.status;
        state.consentRequests[index].updatedAt = new Date().toISOString();
      }
    },

    // Set current consent request
    setCurrentConsentRequest: (
      state,
      action: PayloadAction<AAConsentRequest | undefined>
    ) => {
      state.currentConsentRequest = action.payload;
    },

    // Remove a consent request
    removeConsentRequest: (state, action: PayloadAction<string>) => {
      state.consentRequests = state.consentRequests.filter(
        (request) => request.id !== action.payload
      );
    },

    // Clear all consent requests
    clearConsentRequests: (state) => {
      state.consentRequests = [];
      state.currentConsentRequest = undefined;
    },

    // Reset state to initial state
    resetAAConsentRequestState: () => initialAAConsentRequestState,
  },
});

export const {
  setLoading,
  setError,
  setConsentRequests,
  addConsentRequest,
  updateConsentRequest,
  updateConsentRequestStatus,
  setCurrentConsentRequest,
  removeConsentRequest,
  clearConsentRequests,
  resetAAConsentRequestState,
} = AAConsentRequestSlice.actions;
