import { useState, useRef } from "react";
import { TbPhotoBitcoin, TbUpload, TbX } from "react-icons/tb";
import { HiOutlineVideoCamera } from "react-icons/hi2";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Dialog from "../../../common/dialog";
import { uploadProfileMedia } from "../../../shared/services/api/customer.api";
import { Button } from "../../../common/ui/button";

interface ProfileMediaUploadProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
  readonly currentProfilePic?: string;
  readonly currentProfileVideo?: string;
}

export function ProfileMediaUpload({
  isOpen,
  onClose,
  onSuccess,
  currentProfilePic,
  currentProfileVideo,
}: ProfileMediaUploadProps) {
  const { brandId, customerId } = useParams();
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profileVideo, setProfileVideo] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(
    currentProfilePic || null
  );
  const [profileVideoPreview, setProfileVideoPreview] = useState<string | null>(
    currentProfileVideo || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const profilePicRef = useRef<HTMLInputElement>(null);
  const profileVideoRef = useRef<HTMLInputElement>(null);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file size should be less than 5MB");
        return;
      }

      setProfilePic(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("video/")) {
        toast.error("Please select a valid video file");
        return;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Video file size should be less than 50MB");
        return;
      }

      setProfileVideo(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileVideoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePic = () => {
    setProfilePic(null);
    setProfilePicPreview(currentProfilePic || null);
    if (profilePicRef.current) {
      profilePicRef.current.value = "";
    }
  };

  const removeProfileVideo = () => {
    setProfileVideo(null);
    setProfileVideoPreview(currentProfileVideo || null);
    if (profileVideoRef.current) {
      profileVideoRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!profilePic && !profileVideo) {
      toast.error("Please select at least one file to upload");
      return;
    }

    if (!customerId || !brandId) {
      toast.error("Missing customer or brand information");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      if (profilePic) {
        formData.append("files", profilePic);
      }

      if (profileVideo) {
        formData.append("files", profileVideo);
      }
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await uploadProfileMedia(customerId, brandId, formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response) {
        toast.success("Profile media uploaded successfully!");
        onSuccess();
        handleClose();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload profile media. Please try again."
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setProfilePic(null);
      setProfileVideo(null);
      setProfilePicPreview(currentProfilePic || null);
      setProfileVideoPreview(currentProfileVideo || null);
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Update Profile Media">
      <div className="space-y-6">
        {/* Profile Picture Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TbPhotoBitcoin className="text-purple-500 text-xl" />
            <h3 className="font-medium text-[var(--color-on-background)]">
              Profile Picture
            </h3>
          </div>

          <div className="border-2 border-dashed border-[var(--color-muted)] border-opacity-50 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
            {profilePicPreview ? (
              <div className="relative">
                <img
                  src={profilePicPreview}
                  alt="Profile preview"
                  className="mx-auto h-40 w-40 object-cover rounded-lg"
                />
                <Button onClick={removeProfilePic} disabled={isUploading}>
                  <TbX className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-[var(--color-on-surface)] opacity-70">
                <TbPhotoBitcoin className="mx-auto h-12 w-12 text-[var(--color-on-surface)] opacity-50" />
                <p className="mt-2">Click to upload profile picture</p>
                <p className="text-xs text-[var(--color-on-surface)] opacity-50">
                  JPG, PNG up to 5MB
                </p>
              </div>
            )}

            <input
              ref={profilePicRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePicChange}
              className="hidden"
              disabled={isUploading}
            />

            <Button
              onClick={() => profilePicRef.current?.click()}
              disabled={isUploading}
              variant="outline"
            >
              {profilePic ? "Change Picture" : "Upload Picture"}
            </Button>
          </div>
        </div>

        {/* Profile Video Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HiOutlineVideoCamera className="text-[var(--color-on-primary)] text-xl" />
            <h3 className="font-medium text-[var(--color-on-background)]">
              Profile Video
            </h3>
          </div>

          <div className="border-2 border-dashed border-[var(--color-muted)] border-opacity-50 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            {profileVideoPreview ? (
              <div className="relative">
                <video
                  src={profileVideoPreview}
                  controls
                  className="mx-auto h-40 w-60 object-cover rounded-lg"
                >
                  <track kind="captions" src="" label="No captions available" />
                </video>
                <Button
                  onClick={removeProfileVideo}
                  className="absolute -top-2 -right-2 bg-[var(--color-error)] bg-opacity-100 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  disabled={isUploading}
                >
                  <TbX className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-[var(--color-on-surface)] opacity-70">
                <HiOutlineVideoCamera className="mx-auto h-12 w-12 text-[var(--color-on-surface)] opacity-50" />
                <p className="mt-2">Click to upload profile video</p>
                <p className="text-xs text-[var(--color-on-surface)] opacity-50">
                  MP4, MOV up to 50MB
                </p>
              </div>
            )}

            <input
              ref={profileVideoRef}
              type="file"
              accept="video/*"
              onChange={handleProfileVideoChange}
              className="hidden"
              disabled={isUploading}
            />

            <Button
              onClick={() => profileVideoRef.current?.click()}
              disabled={isUploading}
              variant="outline"
            >
              {profileVideo ? "Change Video" : "Upload Video"}
            </Button>
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-[var(--color-muted)] bg-opacity-30 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            variant="surface"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || (!profilePic && !profileVideo)}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading...
              </>
            ) : (
              <>
                <TbUpload className="w-4 h-4" />
                Upload Media
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
