import ReactPixel from "react-facebook-pixel";
import { useEffect } from "react";

const useFacebookPixel = () => {
  const pixelMap: Record<string, string> = {
    "web1.qualoan.com": "2585375558491271",
    "web.qualoan.com": "1891652661412856",
    "web1.salary4sure.com": "2280702332389829",
    "web.minutesloan.com": "887788353742142",
    "web.salary4sure.com": "752584057506756",
    "web3.salary4sure.com": "1506306374431185",
  };

  const domain = window.location.hostname;
  const pixelId = pixelMap[domain];

  useEffect(() => {
    if (pixelId) {
      // Initialize Meta Pixel
      ReactPixel.init(pixelId, undefined, {
        autoConfig: true,
        debug: false, // Set to true for development
      });

      // Track initial page view
      ReactPixel.pageView();
    } else {
      console.warn(`No Meta Pixel ID found for domain: ${domain}`);
    }
  }, [pixelId, domain]);

  // Return tracking functions for use in components
  return {
    trackEvent: (eventName: string, data?: Record<string, any>) => {
      if (pixelId) {
        ReactPixel.track(eventName, data);
      }
    },
    trackCustomEvent: (eventName: string, data?: Record<string, any>) => {
      if (pixelId) {
        ReactPixel.trackCustom(eventName, data);
      }
    },
    pageView: () => {
      if (pixelId) {
        ReactPixel.pageView();
      }
    },
  };
};

export default useFacebookPixel;
