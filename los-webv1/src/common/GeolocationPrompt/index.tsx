import { useState, useEffect, useCallback } from "react";
import Dialog from "../dialog";

const GeolocationPrompt = () => {
  const [, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>("prompt");
  const [showDialog, setShowDialog] = useState(false);

  const handleClose = () => {
    setShowDialog(false);
    localStorage.setItem("geoDismissed", "true");
    setLocation(null);
  };

  const getLocation = useCallback(() => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setError("");
        setIsLoading(false);
        setShowDialog(false); // Hide dialog after success
        localStorage.setItem("geoDismissed", "true");
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setPermissionStatus("denied");
            setError("Location access denied. Please enable permissions in browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setError("Location information unavailable.");
              break;
          case error.TIMEOUT:
            setError("Location request timed out.");
            break;
          default:
            setError("Failed to get location.");
        }
        setIsLoading(false);
        setShowDialog(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const status = await navigator.permissions.query({ name: "geolocation" });
        setPermissionStatus(status.state);

        if (status.state === "granted") {
          getLocation(); // Auto-fetch location
        } else if (status.state === "prompt") {
          getLocation(); // Trigger permission prompt
          setShowDialog(true);
        } else {
          // denied
          setShowDialog(true);
        }

        status.onchange = () => {
          setPermissionStatus(status.state);
          if (status.state === "granted") {
            getLocation();
          }
        };
      } catch (error) {
        console.error("Error checking permissions:", error);
      }
    };

    checkPermission();
  }, [getLocation]);

  if (!("geolocation" in navigator)) {
    return (
      <Dialog isOpen={showDialog} onClose={handleClose} title="Location Access">
        <div className="text-center p-6">
          <div className="text-4xl mb-4">🌍</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Geolocation Not Supported</h2>
          <p className="text-gray-600 mb-4">Your browser doesn't support geolocation features.</p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog 
      isOpen={showDialog} 
      onClose={handleClose} 
      title="Location Access"
    >
      <div className="p-6">
        {permissionStatus === "denied" ? (
          <div className="text-center">
            <div className="text-4xl mb-4 text-red-500">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Permission Required</h2>
            <p className="text-gray-600 mb-4">Please enable location access in your browser settings.</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-4">📍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Fetching Location...</h2>
            <p className="text-gray-600 mb-4">We're trying to get your location to provide better service.</p>

            {error && (
              <div className="text-red-600 bg-red-50 rounded-brand p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="inline-flex items-center justify-center text-sm text-gray-700">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                Attempting to fetch location...
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>
            By allowing location access, you agree to our{" "}
            <a href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>.
          </p>
        </div>
      </div>
    </Dialog>
  );
};

export default GeolocationPrompt;
// This code is a React component that prompts the user for geolocation access.