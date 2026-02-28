import { useState, useRef, useEffect } from "react";
import { uploadPublicFile } from "../../../services/api/aws-s3.api";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { updatePersonalDetails } from "../../../services/api/user-details.api";
import { updateUserDetails } from "../../../redux/slices/userDetails";
import { FaCheckCircle, FaTimes, FaCamera } from "react-icons/fa";
import { TbCameraSelfie } from "react-icons/tb";

const PhotoUploader: React.FC = () => {
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.user);
  const [, setImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [, setShowManualUpload] = useState(false);
  const userDetails = useAppSelector((state) => state.userDetails);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if camera is supported
  const isCameraSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  // Start camera with improved error handling
  const startCamera = async () => {
    setError(null);
    setIsCapturing(true);
    setUploadSuccess(false);

    if (!isCameraSupported()) {
      setError(
        "Camera is not supported on this browser. Please use manual upload."
      );
      setIsCapturing(false);
      setShowManualUpload(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      let errorMessage = "Camera access denied or not available";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage =
            "Camera permission denied. Please allow camera access or use manual upload.";
        } else if (err.name === "NotFoundError") {
          errorMessage =
            "No camera found on this device. Please use manual upload.";
        } else if (err.name === "NotReadableError") {
          errorMessage =
            "Camera is already in use by another application. Please use manual upload.";
        } else if (err.name === "NotSupportedError") {
          errorMessage =
            "Camera is not supported on this browser. Please use manual upload.";
        }
      }
      setError(errorMessage);
      setIsCapturing(false);
      setShowManualUpload(true);
      console.error("Error accessing camera:", err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  // Capture selfie and upload with progress tracking
  const captureAndUpload = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      setUploadProgress(20);

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      setUploadProgress(40);

      const imageData = canvasRef.current.toDataURL("image/jpeg", 0.8);
      setImage(imageData);

      setUploadProgress(60);

      const response = await fetch(imageData);
      const blob = await response.blob();
      const filename = `selfie_${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: "image/jpeg" });

      setUploadProgress(80);

      const result = await uploadPublicFile(file, 
        userData.user.brandId,
        userData.user.id);
      if (result) {
        setUploadProgress(100);
        const updateResponse = await updatePersonalDetails(
          userData.user.userDetailsId,
          {
            profilePicUrl: result.url,
            userId: userData.user.id,
          }
        );
        if (updateResponse) {
          setImage(result.url);
          setUploadSuccess(true);
          dispatch(updateUserDetails(updateResponse));
        } else {
          setError("Failed to update user details. Please try again.");
        }
      }
    } catch (err) {
      setError(
        "Failed to upload image. Please check your connection and try again."
      );
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      stopCamera();
    }
  };

  // Handle manual file upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, etc.)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      setUploadProgress(20);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setUploadProgress(60);

      const result = await uploadPublicFile(file, 
         userData.user.brandId,
        userData.user.id);
      if (result) {
        setUploadProgress(80);
        const updateResponse = await updatePersonalDetails(
          userData.user.userDetailsId,
          {
            profilePicUrl: result.url,
            userId: userData.user.id,
          }
        );
        if (updateResponse) {
          setUploadProgress(100);
          setImage(result.url);
          setUploadSuccess(true);
          dispatch(updateUserDetails(updateResponse));
          setShowManualUpload(false);
        } else {
          setError("Failed to update user details. Please try again.");
        }
      }
    } catch (err) {
      setError(
        "Failed to upload image. Please check your connection and try again."
      );
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // const triggerFileInput = () => {
  //   fileInputRef.current?.click();
  // };

  useEffect(() => {
    if (userDetails?.profilePicUrl) {
      setUploadSuccess(true);
      setImage(userDetails.profilePicUrl);
    }
  }, [userDetails?.profilePicUrl]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom duration-500">
      {/* Enhanced Card Container */}
      <div>
        {/* Enhanced Header Section */}
        <div className="flex items-start gap-5 p-4">
          {/* Enhanced Content */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  Selfie Verification
                </h3>
                {uploadSuccess ? (
                  <span className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-sm px-3 py-1.5 rounded-full font-semibold border border-green-200">
                    <FaCheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 text-sm px-3 py-1.5 rounded-full font-semibold border border-amber-200">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                    Required
                  </span>
                )}
              </div>

              <p className="text-gray-600 leading-relaxed mb-3">
                Take a clear selfie to verify your identity and complete your
                profile
              </p>

              {userDetails?.profilePicUrl && (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={userDetails.profilePicUrl}
                  className="inline-flex items-center gap-2 text-primary text-sm font-semibold transition-colors underline rounded-lg"
                >
                  <span>View Current Photo</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Inline Camera View */}
        {isCapturing && (
          <div className="mx-4 mb-4">
            <div className="relative bg-black rounded-2xl overflow-hidden shadow-lg">
              {/* Camera Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
                <div className="flex items-center justify-between text-white">
                  <button
                    onClick={stopCamera}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 transition-all active:scale-95"
                  >
                    <FaTimes className="text-sm" />
                  </button>
                  <h4 className="text-sm font-medium">
                    Position your face in the frame
                  </h4>
                  <div className="w-10" />
                </div>
              </div>

              {/* Camera Preview */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 md:h-80 object-cover"
              />

              {/* Camera Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-64 md:w-56 md:h-72 border-2 border-white/60 rounded-2xl relative">
                  <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-white rounded-tl-lg" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-white rounded-tr-lg" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-white rounded-bl-lg" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-white rounded-br-lg" />
                </div>
              </div>

              {/* Camera Controls */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <button
                  onClick={captureAndUpload}
                  disabled={isUploading}
                  className="flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isUploading ? (
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  ) : (
                    <FaCamera className="text-xl text-gray-800" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Message */}
        {error && (
          <div className="mx-4 mb-4 animate-in slide-in-from-left duration-300">
            <div className="flex items-start gap-4 bg-red-50 text-red-800 p-4 rounded-2xl border border-red-200 shadow-sm">
              <span className="text-2xl flex-shrink-0 mt-0.5">⚠️</span>
              <div>
                <p className="font-semibold text-sm">Upload Failed</p>
                <p className="text-sm mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Action Buttons */}
        <div className="px-4 pb-6">
          <div className="flex flex-col gap-3">
            {!uploadSuccess && (
              <>
                {/* Camera Button */}
                <button
                  onClick={isCapturing ? stopCamera : startCamera}
                  className="w-full bg-primary hover:bg-primary-hover text-on-primary font-semibold py-4 px-6 rounded-2xl transition-all active:scale-98 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                >
                  <TbCameraSelfie className="text-xl" />
                  <span>{isCapturing ? "Cancel Camera" : "Take Selfie"}</span>
                </button>

                {/* Or Divider */}
                {/* <div className="flex items-center justify-center py-2">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="px-4 text-sm text-gray-500 font-medium">or</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div> */}

                {/* Manual Upload Button */}
                {/* <button
                  onClick={triggerFileInput}
                  disabled={isUploading}
                  className="w-full bg-gray-600 text-white hover:bg-gray-700 py-4 px-6 rounded-2xl text-base font-semibold transition-all active:scale-98 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                  >
                  
                  <FaFile className="text-lg" />
                  <span>Upload from Device</span>
                </button> */}

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* Progress indicator */}
          {isUploading && (
            <div className="mt-4 animate-in slide-in-from-bottom duration-300">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-600 mt-2 font-medium">
                {uploadProgress}% complete
              </p>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default PhotoUploader;
