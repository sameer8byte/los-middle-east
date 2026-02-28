import { useState, useEffect } from "react";
import Dialog from "../../../common/dialog";

interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeolocationComponentProps {
  onLocationObtained: (location: GeolocationData) => void;
}

export function GeolocationComponent({
  onLocationObtained,
}: GeolocationComponentProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [status, setStatus] = useState<
    "requesting" | "denied" | "unavailable" | "error" | "success"
  >("requesting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      setErrorMessage(
        "Your browser doesn't support location services. Please use a modern browser."
      );
      return;
    }

    setIsLoading(true);
    setStatus("requesting");
    setErrorMessage(""); // Clear previous error messages
    setRetryCount((prev) => prev + 1);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: GeolocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setIsLoading(false);
        setStatus("success");

        // Show success message briefly before closing
        setTimeout(() => {
          onLocationObtained(locationData);
          setIsOpen(false);
        }, 1500);
      },
      (error) => {
        setIsLoading(false);
        const retryText = retryCount > 1 ? ` (Attempt ${retryCount})` : "";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setStatus("denied");
            if (error.message.includes("Only secure origins")) {
              setErrorMessage(
                `Location requires HTTPS. Please use a secure connection${retryText}`
              );
            } else if (error.message.includes("denied") || retryCount > 1) {
              setErrorMessage(
                `Location is blocked. Click the 🔒 icon in your address bar and select "Allow location"${retryText}`
              );
            } else {
              setErrorMessage(
                `Location access was denied. Please allow it when your browser asks${retryText}`
              );
            }
            break;
          case error.POSITION_UNAVAILABLE:
            setStatus("unavailable");
            if (retryCount > 1) {
              setErrorMessage(
                `Still can't find GPS signal. Try moving to an open area or check device settings${retryText}`
              );
            } else {
              setErrorMessage(
                `GPS is not available. Make sure location services are enabled on your device${retryText}`
              );
            }
            break;
          case error.TIMEOUT:
            setStatus("error");
            if (retryCount > 2) {
              setErrorMessage(
                `GPS keeps timing out. Your device might have location issues${retryText}`
              );
            } else {
              setErrorMessage(
                `GPS is taking too long. This might work better indoors or with Wi-Fi${retryText}`
              );
            }
            break;
          default:
            setStatus("error");
            setErrorMessage(
              `${error.message || "Unable to get your location. Please check your device settings"}${retryText}`
            );
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const renderContent = () => {
    switch (status) {
      case "requesting":
        return (
          <div className="text-center py-4">
            {/* Animated location icon */}
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mb-4 relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
              <svg
                className="w-8 h-8 text-blue-600 relative z-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">
              📍 Location Required
            </h3>
            <p className="text-gray-600 mb-4 text-sm px-4">
              Please allow location access when your browser asks
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center space-x-2 mt-4">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm text-blue-600">
                  Getting location...
                </span>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                💡 Look for the permission popup in your browser
              </div>
            )}
          </div>
        );

      case "denied":
        return (
          <div className="text-center py-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-50 to-red-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">
              🚫 Location Blocked
            </h3>
            
            {/* Show current status clearly */}
            <div className="mb-4">
              {isLoading ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mx-2">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-sm font-medium text-blue-600">
                      {retryCount > 1 ? `Retrying... (${retryCount}${retryCount === 2 ? 'nd' : retryCount === 3 ? 'rd' : 'th'} attempt)` : 'Checking location permissions...'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700">
                    {retryCount > 1 ? 'Please make sure you enabled location in your browser' : 'Your browser will ask for permission again'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-3 text-sm px-4">
                    {errorMessage || "Location access was denied. Please enable it to continue."}
                  </p>
                  
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 mx-2">
                    <p className="text-xs text-orange-800 mb-2 font-medium">
                      {retryCount > 1 ? 'Still blocked? Try this:' : 'Quick Fix:'}
                    </p>
                    {retryCount > 1 ? (
                      <div className="text-xs text-orange-700 space-y-1">
                        <div>1. Look for 🔒 or 📍 icon in your address bar</div>
                        <div>2. Click it and select "Allow" for location</div>
                        <div>3. Refresh the page if needed</div>
                      </div>
                    ) : (
                      <div className="text-xs text-orange-700 space-y-1">
                        <div>🌐 <strong>Chrome/Safari:</strong> Click 🔒 in address bar → Allow</div>
                        <div>🦊 <strong>Firefox:</strong> Click shield icon → Allow location</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={requestLocation}
              disabled={isLoading}
              className={`w-full px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2 text-white">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Requesting...</span>
                </div>
              ) : (
                `🔄 ${retryCount > 1 ? 'Try Again' : 'Request Location'} ${retryCount > 1 ? `(${retryCount})` : ''}`
              )}
            </button>
            
            <p className="text-xs text-gray-500 mt-2">
              {retryCount > 1 
                ? `Attempt ${retryCount}: Make sure location is enabled in browser settings` 
                : 'After enabling, click the button to request again'
              }
            </p>
          </div>
        );

      case "unavailable":
        return (
          <div className="text-center py-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-50 to-amber-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.07-7.07c2.929-2.929 7.678-2.929 10.607 0M2.343 7.343c4.686-4.686 12.284-4.686 16.97 0"
                />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">
              🛰️ Service Unavailable
            </h3>
            <p className="text-gray-600 mb-4 text-sm px-4">
              {errorMessage ||
                "GPS or network issues are preventing location detection."}
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 mx-2">
              <div className="text-xs text-yellow-800 space-y-1">
                <div>• Check internet connection</div>
                <div>• Enable device location services</div>
                <div>• Move to area with better signal</div>
              </div>
            </div>

            <button
              onClick={requestLocation}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-6 py-2.5 rounded-lg font-medium hover:from-amber-600 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Retrying...</span>
                </div>
              ) : (
                `🔄 Try Again ${retryCount > 1 ? `(${retryCount})` : ''}`
              )}
            </button>
            
            {retryCount > 1 && (
              <p className="text-xs text-gray-500 mt-2">
                Attempt {retryCount}: Check device settings and signal strength
              </p>
            )}
          </div>
        );

      case "error":
        return (
          <div className="text-center py-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-50 to-pink-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">
              ⚠️ Location Error
            </h3>
            <p className="text-gray-600 mb-4 text-sm px-4">
              {errorMessage ||
                "Something went wrong while getting your location"}
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 mx-2">
              <p className="text-xs text-red-800">
                💪 Don't worry! This usually works on the second try.
              </p>
            </div>

            <button
              onClick={requestLocation}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-2.5 rounded-lg font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Retrying...</span>
                </div>
              ) : (
                `🔄 Try Again ${retryCount > 1 ? `(${retryCount})` : ''}`
              )}
            </button>
            
            {retryCount > 1 && (
              <p className="text-xs text-gray-500 mt-2">
                Attempt {retryCount}: Most location issues resolve after a few tries
              </p>
            )}
          </div>
        );

      case "success":
        return (
          <div className="text-center py-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-50 to-emerald-100 rounded-full flex items-center justify-center mb-4 relative">
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
              <svg
                className="w-8 h-8 text-green-600 relative z-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-green-900 mb-2">
              ✅ Location Found!
            </h3>
            <p className="text-green-700 mb-4 text-sm">
              Successfully detected your location
            </p>

            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-600 border-t-transparent"></div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {}}
      title="📍 Location Required"
      size="md"
    >
      <div className="text-gray-700 -mt-2">{renderContent()}</div>
    </Dialog>
  );
}

// Legacy export for backward compatibility
export function getGeolocationScript() {
  return GeolocationComponent;
}
