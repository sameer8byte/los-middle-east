import { useState } from 'react';

interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function useGeolocation() {
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);

  const requestLocation = () => {
    setShowLocationDialog(true);
  };

  const handleLocationObtained = (locationData: GeolocationData) => {
    setLocation(locationData);
    setShowLocationDialog(false);
  };

  return {
    location,
    showLocationDialog,
    requestLocation,
    handleLocationObtained,
  };
}
