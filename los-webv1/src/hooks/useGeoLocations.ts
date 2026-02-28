import { useEffect, useState } from "react";
import { extractCustomParams } from "../utils/utils";

type Coordinates = {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
};

export function useGeolocation(): Coordinates {
  const customParams = extractCustomParams();
  const [location, setLocation] = useState<Coordinates>({
    latitude: null,
    longitude: null,
    error: null,
  });

  useEffect(() => {
     // If custom parameters are available, use them
    if (customParams.lat && customParams.lng) {
      setLocation({
        latitude: parseFloat(customParams.lat),
        longitude: parseFloat(customParams.lng),
        error: null,
      });
      return;
    }
     if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser.",
      }));
      return;
    }
 
    if ("geolocation" in navigator) {
 
      navigator.geolocation.getCurrentPosition(
        (position) => {
           setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
          });
        },
        (err) => {
           setLocation((prev) => ({
            ...prev,
            error: err.message,
          }));
        },
        {
          enableHighAccuracy: true,
          timeout: 5000, // Force error after 5 seconds
          maximumAge: 0,
        }
      );
    } 
  }, [customParams.lat, customParams.lng]);

  return location;
}
