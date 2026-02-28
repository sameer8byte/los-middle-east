import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { USER_SLICE_LABEL } from "./storeLabels";
import { listenerMiddleware } from "./middleware";
import { AuthSlice, initialAuthState } from "./slices/partnerUser.slice";
import { BrandSlice } from "./slices/brand.slice";
import { UserSlice } from "./slices/user";
import commonReducer from "./slices/common";

export const store = configureStore({
  reducer: {
    auth: AuthSlice.reducer,
    brand: BrandSlice.reducer,
    user: UserSlice.reducer,
    common: commonReducer,
  },

  // ? Preload state from session storage
  preloadedState: {
    auth: sessionStorage.getItem(USER_SLICE_LABEL)
      ? JSON.parse(sessionStorage.getItem(USER_SLICE_LABEL) as string)
      : initialAuthState,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(listenerMiddleware.middleware),
});

export type AppDispatch = typeof store.dispatch;

export type RootState = ReturnType<typeof store.getState>;
// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
