import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import {
  updateAccessToken,
  updateLogout,
  updateUser,
  updateUserData,
  updateUserEmail,
  updateUserLogout,
  updateUserOnboardingStep,
  updateUserPhone,
 } from "./slices/user";
import { USER_SLICE_LABEL } from "./storeLabels";
import { RootState } from "./store";

export const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  matcher: isAnyOf(
    updateUserData,
    updateUserLogout,
    updateUserEmail,
    updateUserPhone,
    updateLogout,
    updateUser,
    updateAccessToken,
    updateUserOnboardingStep,
  ),
  effect: (_, listenerApi) => {
    localStorage.setItem(
      USER_SLICE_LABEL,
      JSON.stringify((listenerApi.getState() as unknown as RootState).user),
    );
  },
});
