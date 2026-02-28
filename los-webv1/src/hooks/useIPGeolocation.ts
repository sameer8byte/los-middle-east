import { useEffect, useState } from "react";

type IPLocation = {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  error: string | null;
};

const LOCAL_STORAGE_KEY = "ip_location_data";

export function useIPGeolocation(): IPLocation {
  const [location, setLocation] = useState<IPLocation>({
    latitude: null,
    longitude: null,
    city: null,
    region: null,
    country: null,
    error: null,
  });

  useEffect(() => {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setLocation(parsedData);
        return;
      } catch {
        // If parsing fails, clear invalid data
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }

    const fetchLocation = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/", {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Network response failed");

        const data = await response.json();

        if (data.error)
          throw new Error(data.reason || "IP location service error");

        const locationData: IPLocation = {
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          city: data.city || null,
          region: data.region || null,
          country: data.country || null,
          error: null,
        };

        setLocation(locationData);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(locationData));
      } catch (error: any) {
        console.error("Failed to fetch IP geolocation data", error);
        setLocation((prev) => ({
          ...prev,
          error: error?.message || "Failed to fetch location",
        }));
      }
    };

    fetchLocation();
  }, []);

  return location;
}
