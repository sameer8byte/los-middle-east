import { createUtmTracking } from "../services/api/web.api";

export interface UTMParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  utm_id?: string;
  fbclid?: string;
  clickid?: string;
}

/**
 * Get UTM params from URL and merge with stored localStorage
 */
export const getUTMParameters = (): UTMParameters => {
  const urlParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );

  // Get default utm_source and utm_medium based on domain
  const getDefaultUtmValues = () => {
    if (typeof window === "undefined")
      return { source: undefined, medium: undefined };

    const hostname = window.location.hostname;

    if (hostname === "web1.paisapop.com" || hostname === "localhost") {
      return { source: "paisapop", medium: "website" };
    }

    // Add more domain mappings as needed
    return { source: undefined, medium: undefined };
  };

  const defaults = getDefaultUtmValues();

  const urlUtmParams: UTMParameters = {
    utm_source: urlParams.get("utm_source") || defaults.source || undefined,
    utm_medium: urlParams.get("utm_medium") || defaults.medium || undefined,
    utm_campaign: urlParams.get("utm_campaign") || undefined,
    utm_content: urlParams.get("utm_content") || undefined,
    utm_term: urlParams.get("utm_term") || undefined,
    utm_id: urlParams.get("utm_id") || undefined,
    fbclid: urlParams.get("fbclid") || undefined,
    clickid: urlParams.get("clickid") || undefined,
  };

  let storedParams: UTMParameters = {};
  const stored =
    typeof window !== "undefined" ? localStorage.getItem("utm_params") : null;
  if (stored) {
    try {
      storedParams = JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing stored UTM params:", e);
    }
  }

  // Merge URL params (non-empty) with stored params
  return {
    ...storedParams,
    ...Object.fromEntries(
      Object.entries(urlUtmParams).filter(([_, val]) => val !== undefined)
    ),
  };
};

/**
 * Store UTM params in localStorage
 */
export const storeUTMParameters = (utmParams: UTMParameters): void => {
  if (typeof window === "undefined") return;
  if (Object.values(utmParams).some((value) => value)) {
    localStorage.setItem("utm_params", JSON.stringify(utmParams));
  }
};

/**
 * Clear UTM params
 */
export const clearUTMParameters = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("utm_params");
};

/**
 * Check if any UTM params exist
 */
export const hasUTMParameters = (utmParams?: UTMParameters): boolean => {
  const params = utmParams || getUTMParameters();
  return Object.values(params).some((val) => val);
};

/**
 * Helper to add non-empty UTM params to an object
 */
const addUtmToParams = (params: any, utmParams: UTMParameters): any => ({
  ...params,
  ...Object.fromEntries(Object.entries(utmParams).filter(([_, val]) => val)),
});

/**
 * Track login with Google Analytics
 */
const trackWithGoogleAnalytics = (
  userId: string,
  loginMethod: string,
  utmParams: UTMParameters,
  eventName = "login"
) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    const gtagParams = addUtmToParams(
      { user_id: userId, method: loginMethod, send_to: "AW-XXXXXXX" },
      utmParams
    );
    (window as any).gtag("event", eventName, gtagParams);
  }
};

/**
 * Track login with Facebook Pixels
 */
const trackWithFacebookPixels = (
  loginMethod: string,
  utmParams: UTMParameters,
  pixelIds: string[],
  eventName = "CompleteRegistration"
) => {
  if (typeof window === "undefined" || !(window as any).fbq) return;
  pixelIds.forEach((id) => {
    const fbParams = addUtmToParams(
      { content_name: "User Login", method: loginMethod },
      utmParams
    );
    (window as any).fbq("trackSingle", id, eventName, fbParams);
  });
};

/**
 * Track UTM event to backend
 */
const trackWithBackend = async (
  userId: string,
  brandId: string,
  utmParams: UTMParameters
) => {
  if (!hasUTMParameters(utmParams)) return;

  try {
    await createUtmTracking({
      utmSource: utmParams.utm_source || "",
      utmMedium: utmParams.utm_medium || "",
      utmCampaign: utmParams.utm_campaign || "",
      utmContent: utmParams.utm_content || "",
      utmTerm: utmParams.utm_term || "",
      utmId: utmParams.utm_id || "",
      fbclid: utmParams.fbclid || "",
      clickid: utmParams.clickid || "",
      userId,
      brandId,
    });
  } catch (error) {
    console.error("Error sending UTM tracking to backend:", error);
  }
};

/**
 * Main function to track login events
 */
export const trackLoginEvent = async (
  userId: string,
  brandId: string,
  loginMethod: "otp" | "google" | "email" = "otp",
  pixelIds: string[] = [],
  eventName = "CompleteRegistration"
) => {
  try {
    const utmParams = getUTMParameters();

    trackWithGoogleAnalytics(userId, loginMethod, utmParams, eventName);

    if (pixelIds.length) {
      trackWithFacebookPixels(loginMethod, utmParams, pixelIds, eventName);
    } else if (typeof window !== "undefined" && (window as any).fbq) {
      const fbParams = addUtmToParams(
        { content_name: "User Login", method: loginMethod },
        utmParams
      );
      (window as any).fbq("track", eventName, fbParams);
    }
    if (utmParams?.clickid) {
      try {
        const trackUrl = `https://affiliates.adsplay.in/trackingcode_installs.php?clickid=${utmParams?.clickid}`;
        await fetch(trackUrl);
      } catch (trackingError) {
        console.error("Error tracking click ID:", trackingError);
      }
    }

    await trackWithBackend(userId, brandId, utmParams);
  } catch (error) {
    console.error("Error tracking login event:", error);
  }
};

/**
 * Track conversion events with GA
 */
export const trackConversionEvent = async (
  userId: string,
  eventName: string = "conversion",
  value?: number,
  currency: string = "INR"
) => {
  try {
    const utmParams = getUTMParameters();

    if (typeof window !== "undefined" && (window as any).gtag) {
      const gtagParams: any = { user_id: userId, send_to: "AW-17491558626" };

      if (value) {
        gtagParams.value = value;
        gtagParams.currency = currency;
      }

      // Add all UTM params
      Object.assign(gtagParams, utmParams);

      (window as any).gtag("event", eventName, gtagParams);
    }
  } catch (error) {
    console.error(`Error tracking ${eventName}:`, error);
  }
};
