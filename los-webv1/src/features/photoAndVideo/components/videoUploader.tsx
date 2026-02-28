import { useState, useRef, useEffect } from "react";
import { uploadPublicFile } from "../../../services/api/aws-s3.api";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import { updatePersonalDetails } from "../../../services/api/user-details.api";
import { updateUserDetails } from "../../../redux/slices/userDetails";
import {
  FaCheckCircle,
  FaTimes,
  FaPlay,
  FaPause,
  FaUpload,
} from "react-icons/fa";
import { FaVideo } from "react-icons/fa6";

const VIDEO_DURATIONS = 20; // seconds

interface PermissionState {
  camera: PermissionState | "granted" | "denied" | "prompt" | "unknown";
  microphone: PermissionState | "granted" | "denied" | "prompt" | "unknown";
}

// Extend Navigator interface for legacy getUserMedia support
interface NavigatorWithUserMedia extends Navigator {
  getUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: any) => void
  ) => void;
  webkitGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: any) => void
  ) => void;
  mozGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: any) => void
  ) => void;
  msGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: any) => void
  ) => void;
}

const VideoUploader: React.FC = () => {
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.user);
  const brand = useAppSelector((state) => state.index);

  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [, setPermissionState] = useState<PermissionState>({
    camera: "unknown",
    microphone: "unknown",
  });
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  const userDetails = useAppSelector((state) => state.userDetails);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const shouldSaveRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check browser compatibility with more thorough checks
  const checkBrowserSupport = (): boolean => {
    try {
      // Check if we're in a secure context (required for camera access)
      if (
        typeof window !== "undefined" &&
        window.location.protocol !== "https:" &&
        window.location.hostname !== "localhost"
      ) {
        setError(
          "Camera access requires a secure connection (HTTPS). Please use manual upload instead."
        );
        setShowManualUpload(true);
        setBrowserSupported(false);
        return false;
      }

      const nav = navigator as NavigatorWithUserMedia;

      // Check getUserMedia support with multiple fallbacks
      const hasGetUserMedia = !!(
        navigator.mediaDevices?.getUserMedia ||
        nav.getUserMedia ||
        nav.webkitGetUserMedia ||
        nav.mozGetUserMedia ||
        nav.msGetUserMedia
      );

      if (!hasGetUserMedia) {
        setError(
          "Your browser doesn't support camera access. Please use manual upload instead."
        );
        setShowManualUpload(true);
        setBrowserSupported(false);
        return false;
      }

      // Check MediaRecorder support
      if (!window.MediaRecorder) {
        setError(
          "Video recording is not supported in your browser. Please use manual upload instead."
        );
        setShowManualUpload(true);
        setBrowserSupported(false);
        return false;
      }

      // Check for supported MIME types with comprehensive list
      const supportedTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm;codecs=h264",
        "video/webm",
        "video/mp4;codecs=h264",
        "video/mp4",
        "video/mpeg",
      ];

      const hasSupport = supportedTypes.some((type) => {
        try {
          return (
            MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)
          );
        } catch (e) {
          return false;
        }
      });

      if (!hasSupport) {
        setError(
          "Video recording format is not supported in your browser. Please use manual upload instead."
        );
        setShowManualUpload(true);
        setBrowserSupported(false);
        return false;
      }

      setBrowserSupported(true);
      return true;
    } catch (err) {
      console.error("Browser support check failed:", err);
      setError(
        "Browser compatibility check failed. Please use manual upload instead."
      );
      setShowManualUpload(true);
      setBrowserSupported(false);
      return false;
    }
  };

  // Get getUserMedia with comprehensive fallbacks
  const getUserMedia = (
    constraints: MediaStreamConstraints
  ): Promise<MediaStream> => {
    // Modern browsers
    if (navigator.mediaDevices?.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }

    const nav = navigator as NavigatorWithUserMedia;

    // Fallback for older browsers
    const legacyGetUserMedia =
      nav.getUserMedia ||
      nav.webkitGetUserMedia ||
      nav.mozGetUserMedia ||
      nav.msGetUserMedia;

    if (!legacyGetUserMedia) {
      return Promise.reject(
        new Error("getUserMedia is not supported in this browser")
      );
    }

    return new Promise((resolve, reject) => {
      try {
        legacyGetUserMedia.call(navigator, constraints, resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  };

  // Enhanced permissions check with better error handling
  const checkPermissions = async (): Promise<boolean> => {
    setIsCheckingPermissions(true);

    try {
      // Check if permissions API is available (not available in all browsers)
      if ("permissions" in navigator && navigator.permissions?.query) {
        try {
          const cameraPermission = await navigator.permissions.query({
            name: "camera" as PermissionName,
          });

          let microphonePermission: PermissionStatus | { state: string };
          try {
            microphonePermission = await navigator.permissions.query({
              name: "microphone" as PermissionName,
            });
          } catch (micErr) {
            // Microphone permission query might fail in some browsers
            console.warn("Microphone permission query failed:", micErr);
            microphonePermission = { state: "prompt" };
          }

          setPermissionState({
            camera: cameraPermission.state as any,
            microphone: microphonePermission.state as any,
          });

          // If permissions are explicitly denied, show manual upload immediately
          if (cameraPermission.state === "denied") {
            setError(
              "Camera access has been blocked. Please enable camera access in your browser settings or use manual upload."
            );
            setShowManualUpload(true);
            setIsCheckingPermissions(false);
            return false;
          }

          if (microphonePermission.state === "denied") {
            setError(
              "Microphone access has been blocked. Please enable microphone access in your browser settings or use manual upload."
            );
            setShowManualUpload(true);
            setIsCheckingPermissions(false);
            return false;
          }
        } catch (permError) {
          console.warn("Permissions query failed:", permError);
          // Continue with direct access attempt for browsers that don't fully support permissions API
        }
      }

      setIsCheckingPermissions(false);
      return true;
    } catch (err) {
      console.warn(
        "Permissions API not supported, will try direct access:",
        err
      );
      setIsCheckingPermissions(false);
      return true; // Fallback to direct getUserMedia
    }
  };

  // Enhanced camera start with comprehensive error handling and browser support
  const startCamera = async () => {
    setError(null);
    setRetryCount((prev) => prev + 1);

    // Check browser support first
    if (!checkBrowserSupport()) {
      return;
    }

    // Check permissions if supported
    const hasPermission = await checkPermissions();
    if (!hasPermission && retryCount > 1) {
      return;
    }

    setIsCameraOn(true);

    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Comprehensive constraint fallback strategy - avoid full screen
      const constraintOptions = [
        // High quality but constrained
        {
          video: {
            facingMode: "user",
            width: { ideal: 640, max: 1280, min: 320 },
            height: { ideal: 480, max: 720, min: 240 },
            frameRate: { ideal: 30, max: 30 },
            aspectRatio: { ideal: 4 / 3 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: { ideal: 44100 },
          },
        },
        // Medium quality fallback
        {
          video: {
            facingMode: "user",
            width: { ideal: 480, max: 640 },
            height: { ideal: 360, max: 480 },
            frameRate: { ideal: 25, max: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        },
        // Basic quality fallback
        {
          video: {
            facingMode: "user",
            width: { max: 640 },
            height: { max: 480 },
          },
          audio: true,
        },
        // Minimal fallback - let browser decide
        {
          video: { facingMode: "user" },
          audio: true,
        },
        // Last resort - any video/audio
        {
          video: true,
          audio: true,
        },
      ];

      let stream: MediaStream | null = null;
      let lastError: any = null;

      // Try each constraint set until one works
      for (let i = 0; i < constraintOptions.length; i++) {
        try {
          stream = await getUserMedia(constraintOptions[i]);
          break;
        } catch (err) {
          lastError = err;
          console.warn(`Failed with constraint set ${i + 1}:`, err);

          // For certain errors, stop trying and show manual upload
          if (
            (err as any)?.name === "NotAllowedError" ||
            (err as any)?.name === "SecurityError"
          ) {
            break;
          }
        }
      }

      if (!stream) {
        throw (
          lastError ||
          new Error("Failed to access camera with all constraint sets")
        );
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video doesn't go fullscreen
        videoRef.current.style.maxWidth = "100%";
        videoRef.current.style.maxHeight = "100%";
        videoRef.current.style.objectFit = "cover";
      }

      // Setup media recorder with comprehensive MIME type fallback
      const supportedTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm;codecs=h264",
        "video/webm",
        "video/mp4;codecs=h264",
        "video/mp4",
      ];

      let mimeType = "video/webm";
      for (const type of supportedTypes) {
        try {
          if (
            MediaRecorder.isTypeSupported &&
            MediaRecorder.isTypeSupported(type)
          ) {
            mimeType = type;
            break;
          }
        } catch (e) {
          console.warn(`MIME type ${type} check failed:`, e);
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 1000000, // 1Mbps to keep file size reasonable
        audioBitsPerSecond: 128000, // 128kbps for good audio quality
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: mimeType,
        });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideo(videoUrl);
        setVideoBlob(blob);
        recordedChunksRef.current = [];

        // Only auto-save if recording was completed (20 seconds)
        if (recordingComplete) {
          autoSaveVideo(blob);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording failed. Please try manual upload instead.");
        setIsRecording(false);
        setShowManualUpload(true);
        stopCamera();
      };

      // Reset retry count on success
      setRetryCount(0);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setIsCameraOn(false);

      // Comprehensive error handling with specific messages
      if (err?.name === "NotAllowedError") {
        setError(
          "Camera access was denied. Please allow camera access in your browser or use manual upload."
        );
        setShowManualUpload(true);
      } else if (err?.name === "NotFoundError") {
        setError(
          "No camera found on your device. Please connect a camera or use manual upload."
        );
        setShowManualUpload(true);
      } else if (err?.name === "NotReadableError") {
        setError(
          "Camera is being used by another application. Please close other camera apps or use manual upload."
        );
        setShowManualUpload(true);
      } else if (err?.name === "OverconstrainedError") {
        if (retryCount < 2) {
          setError(
            "Camera settings not supported. Trying with different settings..."
          );
          setTimeout(() => startCamera(), 1000);
          return;
        } else {
          setError(
            "Camera doesn't support the required settings. Please use manual upload."
          );
          setShowManualUpload(true);
        }
      } else if (err?.name === "SecurityError") {
        setError(
          "Camera access blocked due to security restrictions. Please ensure you're on a secure connection (HTTPS) or use manual upload."
        );
        setShowManualUpload(true);
      } else if (err?.name === "AbortError") {
        setError(
          "Camera access was interrupted. Please try again or use manual upload."
        );
        setShowManualUpload(true);
      } else if (err?.name === "TypeError") {
        setError(
          "Browser doesn't support camera access. Please use manual upload."
        );
        setShowManualUpload(true);
      } else {
        const errorMsg = err?.message || "Unknown error occurred";
        setError(
          `Camera access failed: ${errorMsg}. Please use manual upload instead.`
        );
        setShowManualUpload(true);
      }
    }
  };

  const autoSaveVideo = async (blob: Blob) => {
    try {
      const filename = `video_${Date.now()}.webm`;
      const file = new File([blob], filename, { type: "video/webm" });

      const result = await uploadPublicFile(
        file,
        userData.user.brandId,
        userData.user.id
      );
      if (result) {
        const response = await updatePersonalDetails(
          userData.user.userDetailsId,
          {
            profileVideoUrl: result.url,
            userId: userData.user.id,
          }
        );
        if (response) {
          dispatch(updateUserDetails(response));
          setRecordedVideo(result.url);
          setVideoBlob(null);
        }
      }
    } catch (err) {
      setError("Failed to auto-save video");
      console.error("Auto-save error:", err);
    }
  };

  const stopCamera = () => {
    try {
      // Stop media recorder if recording
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop all tracks in the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }

      // Clear video source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsCameraOn(false);
      setIsRecording(false);
      setRecordingTime(0);
      setError(null);
    } catch (err) {
      console.error("Error stopping camera:", err);
    }
  };

  const startRecording = () => {
    if (mediaRecorderRef.current) {
      shouldSaveRef.current = false;
      recordedChunksRef.current = [];
      setRecordingTime(0);
      setRecordingComplete(false);

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Force exactly 20 seconds recording
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;

          // Stop recording exactly at 20 seconds
          if (newTime >= VIDEO_DURATIONS) {
            setRecordingComplete(true);
            if (
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state === "recording"
            ) {
              mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            // Close camera after recording completes
            setTimeout(() => {
              setIsCameraOn(false);
            }, 500);
            return VIDEO_DURATIONS;
          }
          return newTime;
        });
      }, 1000);
    }
  };

  // const stopRecording = () => {
  //   if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
  //     mediaRecorderRef.current.stop();
  //     setIsRecording(false);

  //     if (timerRef.current) {
  //       clearInterval(timerRef.current);
  //       timerRef.current = null;
  //     }
  //   }
  // };

  const uploadVideo = async () => {
    if (!videoBlob) return;

    setIsUploading(true);
    setError(null);

    try {
      const filename = `video_${Date.now()}.webm`;
      const file = new File([videoBlob], filename, { type: "video/webm" });

      const result = await uploadPublicFile(
        file,
        userData.user.brandId,
        userData.user.id
      );
      if (result) {
        const response = await updatePersonalDetails(
          userData.user.userDetailsId,
          {
            profileVideoUrl: result.url,
            userId: userData.user.id,
          }
        );
        if (response) {
          dispatch(updateUserDetails(response));
          setRecordedVideo(result.url);
          setVideoBlob(null);
        }
      }
    } catch (err) {
      setError("Failed to upload video");
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleVideoPlayback = () => {
    if (previewRef.current) {
      if (isPlaying) {
        previewRef.current.pause();
      } else {
        previewRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Reset error when user interacts
  const handleRetry = () => {
    setError(null);
    setRetryCount(0);
    startCamera();
  };

  // Enhanced file validation
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset previous errors
    setError(null);

    // Comprehensive file type validation
    const validTypes = [
      "video/mp4",
      "video/webm",
      "video/avi",
      "video/mov",
      "video/quicktime",
      "video/x-msvideo",
      "video/3gpp",
      "video/x-ms-wmv",
      "video/ogg",
    ];

    const fileExtension = file.name.toLowerCase().split(".").pop();
    const validExtensions = ["mp4", "webm", "avi", "mov", "wmv", "3gp", "ogg"];

    const isValidType =
      validTypes.includes(file.type) ||
      validExtensions.includes(fileExtension || "");

    if (!isValidType) {
      setError(
        "Please select a valid video file (MP4, WebM, AVI, MOV, WMV, 3GP, OGG)"
      );
      return;
    }

    // Validate file size (max 39MB)
    const maxSize = 39 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(
        "Video file is too large. Please select a file smaller than 39MB."
      );
      return;
    }

    // Validate minimum file size (to avoid empty files)
    const minSize = 1024; // 1KB
    if (file.size < minSize) {
      setError(
        "Video file appears to be empty or corrupted. Please select a valid video file."
      );
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview URL with error handling
    try {
      const videoUrl = URL.createObjectURL(file);
      setRecordedVideo(videoUrl);
    } catch (err) {
      console.error("Error creating preview:", err);
      setError(
        "Failed to create video preview. The file will still upload correctly."
      );
    }
  };

  // Upload manual file
  const uploadManualFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadPublicFile(
        selectedFile,
        userData.user.brandId,
        userData.user.id
      );
      if (result) {
        const response = await updatePersonalDetails(
          userData.user.userDetailsId,
          {
            profileVideoUrl: result.url,
            userId: userData.user.id,
          }
        );
        if (response) {
          dispatch(updateUserDetails(response));
          setRecordedVideo(result.url);
          setSelectedFile(null);
        }
      }
    } catch (err) {
      setError("Failed to upload video");
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Enhanced cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopCamera();

      // Cleanup any blob URLs
      if (recordedVideo && recordedVideo.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(recordedVideo);
        } catch (err) {
          console.warn("Failed to revoke blob URL:", err);
        }
      }
    };
  }, [recordedVideo]);

  useEffect(() => {
    if (userDetails?.profileVideoUrl) {
      setRecordedVideo(userDetails.profileVideoUrl);
    }
  }, [userDetails?.profileVideoUrl]);

  // Show manual upload by default on component mount if browser doesn't support camera
  useEffect(() => {
    const checkInitialSupport = () => {
      if (!checkBrowserSupport()) {
        setShowManualUpload(true);
      }
    };

    checkInitialSupport();
  }, []);

  return (
    <div>
      {/* Header Card */}
      <div className="rounded-2xl shadow-sm border border-edge overflow-hidden bg-surface">
        {/* Top Section with Icon and Status */}
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-4">
            {/* Icon Container */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <FaVideo className="text-primary text-xl md:text-2xl" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-lg md:text-xl font-semibold text-on-surface mb-1">
                  Video Verification
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  {recordedVideo || userDetails?.profileVideoUrl ? (
                    <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs md:text-sm px-2.5 py-1 rounded-full font-medium">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs md:text-sm px-2.5 py-1 rounded-full font-medium">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                      Pending
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-primary leading-relaxed">
                Record a {VIDEO_DURATIONS}-second video introduction or upload a
                video file
              </p>
              {userDetails?.profileVideoUrl && (
                <a
                  href={userDetails.profileVideoUrl}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-2 hover:text-primary-dark transition-colors"
                  rel="noopener noreferrer"
                >
                  <span>View Video</span>
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>

            {/* Check Icon */}
            <div className="flex-shrink-0 ml-3">
              {recordedVideo || userDetails?.profileVideoUrl ? (
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="text-green-600 text-lg" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="text-gray-300 text-lg" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Camera Recording Section - Constrained size to prevent fullscreen */}
        {isCameraOn && (
          <div className="px-4 pb-4 md:px-6 md:pb-6">
            <div
              className="relative w-full max-w-md mx-auto bg-gray-900 rounded-2xl overflow-hidden shadow-lg"
              style={{ aspectRatio: "4/3" }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ maxWidth: "100%", maxHeight: "100%" }}
              />

              {/* Recording overlay */}
              {isRecording && (
                <div className="absolute top-4 left-4 z-10">
                  <div className="flex items-center gap-2 bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-sm font-bold">
                      {VIDEO_DURATIONS - recordingTime}s
                    </span>
                  </div>
                </div>
              )}

              {/* Required phrase overlay */}
              <div className="fixed md:absolute  bottom-125 md:bottom-4 left-4 right-4 z-10">
                <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 text-white text-sm">
                  <div className="text-yellow-300 font-semibold mb-1">
                    📢 Say this phrase:
                  </div>
                  <div className="text-xs leading-relaxed">
                    `Hello , My name is {userDetails?.firstName}, I am availing a
                    short term personal loan from {brand.name} and I
                    authorize the NBFC to visit and contact me at my residence
                    or workplace in case of default in repayment by me.`
                  </div>
                </div>
              </div>

              {/* Controls overlay */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={stopCamera}
                  disabled={isRecording}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white transition-all active:scale-95 hover:bg-black/70 disabled:opacity-50"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="flex items-center justify-center gap-4 mt-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-medium transition-all active:scale-95 shadow-lg"
                >
                  <div className="w-3 h-3 bg-white rounded-full" />
                  <span>Start Recording</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-red-500/90 text-white px-6 py-3 rounded-full font-medium shadow-lg">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  <span>
                    Recording... {VIDEO_DURATIONS - recordingTime}s remaining
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Upload Section - Always show if browser doesn't support camera or if manually requested */}
        {(showManualUpload || !browserSupported) &&
          !userDetails?.profileVideoUrl && (
            <div className="px-4 pb-4 md:px-6 md:pb-6">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50">
                <FaUpload className="text-gray-400 text-3xl mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-700 mb-2">
                  Upload Video File
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Select a video file (MP4, WebM, AVI, MOV, WMV, 3GP, OGG) - Max
                  size: 39MB
                </p>

                {/* Video Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-blue-600 text-lg">📹</span>
                    <div>
                      <h5 className="text-sm font-semibold text-blue-800 mb-2">
                        Video Requirements:
                      </h5>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Duration: Approximately 20 seconds</li>
                        <li>• Quality: Clear video and audio</li>
                        <li>
                          • Orientation: Portrait or landscape (both accepted)
                        </li>
                        <li>
                          • Lighting: Good lighting with clear face visibility
                        </li>
                        <li>
                          • Background: Quiet environment with minimal
                          background noise
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600 text-sm">📢</span>
                      <div>
                        <p className="text-xs font-semibold text-yellow-800 mb-1">
                          Please say this phrase in your video:
                        </p>
                        <p className="text-xs text-yellow-700 italic leading-relaxed">
                          `Hi ${userDetails?.firstName}, I want to apply for a
                          Short Term Personal Loan from ${brand.name} for my
                          personal needs, and I promise to repay it on the due
                          date.`
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.mp4,.webm,.avi,.mov,.wmv,.3gp,.ogg"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                >
                  Choose Video File
                </button>

                {selectedFile && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Selected: {selectedFile.name} (
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Video Preview Section */}
        {recordedVideo && !userDetails?.profileVideoUrl && (
          <div className="px-4 pb-4 md:px-6 md:pb-6">
            <div
              className="relative w-full max-w-md mx-auto bg-gray-900 rounded-2xl overflow-hidden shadow-lg"
              style={{ aspectRatio: "4/3" }}
            >
              <video
                ref={previewRef}
                src={recordedVideo}
                className="h-full w-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                controls
                style={{ maxWidth: "100%", maxHeight: "100%" }}
              />

              {/* Play/Pause Overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer transition-opacity hover:bg-black/30"
                onClick={toggleVideoPlayback}
              >
                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                  {isPlaying ? (
                    <FaPause className="text-gray-800 text-xl" />
                  ) : (
                    <FaPlay className="text-gray-800 text-xl ml-1" />
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 gap-3 w-full flex justify-center">
                <button
                  onClick={selectedFile ? uploadManualFile : uploadVideo}
                  disabled={isUploading}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 disabled:opacity-70 shadow-lg"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Confirm & Upload</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (selectedFile) {
                      setSelectedFile(null);
                      setRecordedVideo(null);
                    } else {
                      startCamera();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full text-sm font-medium transition-all active:scale-95 shadow-lg"
                >
                  <span>🔄</span>
                  <span>Retake</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Message */}
        {error && (
          <div className="mx-4 mb-4 md:mx-6 md:mb-6">
            <div className="flex items-start gap-3 bg-red-50 text-red-800 p-4 rounded-xl border border-red-200">
              <span className="text-lg flex-shrink-0 mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">{error}</p>
                <div className="flex flex-wrap gap-2">
                  {!showManualUpload && browserSupported && (
                    <button
                      onClick={() => setShowManualUpload(true)}
                      className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                    >
                      <FaUpload className="w-3 h-3" />
                      <span>Use Manual Upload</span>
                    </button>
                  )}
                  {browserSupported &&
                    (error.includes("denied") ||
                      error.includes("blocked") ||
                      retryCount > 0) && (
                      <button
                        onClick={handleRetry}
                        disabled={isCheckingPermissions}
                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-70"
                      >
                        {isCheckingPermissions ? (
                          <>
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            <span>Checking...</span>
                          </>
                        ) : (
                          <>
                            <span>🔄</span>
                            <span>Try Again</span>
                          </>
                        )}
                      </button>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!isCameraOn && !recordedVideo && !userDetails?.profileVideoUrl && (
        <div className="mt-6 space-y-3">
          {browserSupported && (
            <>
              <button
                onClick={startCamera}
                disabled={isCheckingPermissions}
                className="w-full bg-primary hover:bg-primary-hover text-on-primary font-semibold py-4 px-6 rounded-2xl transition-all active:scale-98 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                {isCheckingPermissions ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Checking Permissions...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🎬</span>
                    <span>Start Video Recording</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <span className="text-sm text-gray-500">or</span>
              </div>
            </>
          )}

          <button
            onClick={() => setShowManualUpload(true)}
            className="w-full bg-gray-600 text-white hover:bg-gray-700 py-4 px-6 rounded-2xl text-base font-semibold transition-all active:scale-98 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
          >
            <FaUpload className="text-xl" />
            <span>Upload Video File</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
