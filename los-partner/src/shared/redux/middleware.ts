import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";

import { USER_SLICE_LABEL } from "./storeLabels";
import { RootState } from "./store";
import { updateAccessToken, updatePartnerUserData } from "./slices/partnerUser.slice";

export const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  matcher: isAnyOf(
    updatePartnerUserData, updateAccessToken
  ),
  effect: (_:any, listenerApi) => {
    const authState = (listenerApi.getState() as unknown as RootState).auth;
    // Store auth state in sessionStorage
    sessionStorage.setItem(
      USER_SLICE_LABEL,
      JSON.stringify(authState),
    );
    // Also store access token separately for axios interceptor
    if (authState.accessToken) {
      sessionStorage.setItem("access_token", authState.accessToken);
    }
  },
});
