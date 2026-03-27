import {
  configureStore,
} from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { initialUserState, UserSlice } from "./slices/user";
import { USER_SLICE_LABEL, USER_EMPLOYMENT_SLICE_LABEL } from "./storeLabels";
import { listenerMiddleware } from "./middleware";
import { IndexSlice } from "./slices";
import { EmploymentSlice, initialEmploymentState } from "./slices/employment";
import { BankAccountSlice } from "./slices/bankAccount";
import { UserDetailsSlice } from "./slices/userDetails";
import { DocumetnsSlice } from "./slices/documents";
 import { AlternatePhoneNumbersSlice } from "./slices/alternatePhoneNumbers";
import { UserGeoLocationSlice } from "./slices/userGeoLocation";
import { AAConsentRequestSlice } from "./slices/aaConsentRequests";
import { LoanCredibilitySlice } from "./slices/loanCredibility";

export const store = configureStore({
  reducer: {
     user: UserSlice.reducer,
     employment: EmploymentSlice.reducer,
     bankAccount: BankAccountSlice.reducer,
     documents: DocumetnsSlice.reducer,
     userDetails: UserDetailsSlice.reducer,
     loanCredibility: LoanCredibilitySlice.reducer,
     index:IndexSlice.reducer,
     alternatePhoneNumbers: AlternatePhoneNumbersSlice.reducer,
     userGeoLocation: UserGeoLocationSlice.reducer,
     aaConsentRequests: AAConsentRequestSlice.reducer,
  },

  // ? Preload state from local storage
  preloadedState: {
    user: localStorage.getItem(USER_SLICE_LABEL)
      ? JSON.parse(localStorage.getItem(USER_SLICE_LABEL) as string)
      : initialUserState,
    employment: localStorage.getItem(USER_EMPLOYMENT_SLICE_LABEL)
      ? JSON.parse(localStorage.getItem(USER_EMPLOYMENT_SLICE_LABEL) as string)
      : initialEmploymentState,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(listenerMiddleware.middleware)
});

export type AppDispatch = typeof store.dispatch;

export type RootState = ReturnType<typeof store.getState>;
// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
