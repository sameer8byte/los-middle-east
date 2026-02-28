import { useParams } from "react-router-dom";
import { useState } from "react";
import Dialog from "../../../common/dialog";
import { useQueryParams } from "../../../hooks/useQueryParams";
import Avatar from "../../../common/ui/avatar";
import { isOtherRoles } from "../../../lib/role";
import { useAppSelector } from "../../../shared/redux/store";
import { Input } from "../../../common/ui/input";
import { Button } from "../../../common/ui/button";
import { changePassword } from "../../../shared/services/api/auth.api";
export function Profile() {
  const { brandId } = useParams<{ brandId: string }>();
  const { getQuery, removeQuery } = useQueryParams();
  const user = useAppSelector((state) => state.auth.data);
  const brand = useAppSelector((state) => state.brand);

  // Change password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  
  // Password visibility state
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const togglePasswordVisibility = (field: keyof typeof passwordVisibility) => {
    setPasswordVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const getPasswordMatchStatus = () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) return null;
    return passwordForm.newPassword === passwordForm.confirmPassword;
  };

  const renderPasswordIcon = (field: keyof typeof passwordVisibility) => {
    const isVisible = passwordVisibility[field];
    return (
      <button
        type="button"
        onClick={() => togglePasswordVisibility(field)}
        className="text-[var(--color-on-surface)]  hover:text-[var(--color-on-surface)]focus:outline-none focus:text-[var(--color-on-surface)] opacity-70 transition-colors"
      >
        {isVisible ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12l2.122-2.122M9.878 9.878L5.636 5.636M14.122 14.122L18.364 18.364M14.122 14.122L12 12m2.122 2.122l4.242 4.242" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    );
  };

  const renderPasswordMatchIndicator = () => {
    const matchStatus = getPasswordMatchStatus();
    if (matchStatus === null) return null;
    
    return (
      <div className="flex items-center gap-1 text-xs mt-1">
        {matchStatus ? (
          <>
            <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-[var(--color-on-success)]">Passwords match</span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-[var(--color-on-error)]">Passwords do not match</span>
          </>
        )}
      </div>
    );
  };

  const validatePasswordForm = () => {
    const errors: Record<string, string> = {};
    
    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Current password is required";
    }
    
    if (!passwordForm.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters long";
    }
    
    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = "New password must be different from current password";
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;
    
    setIsPasswordLoading(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      // Reset form and show success
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordVisibility({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
      setIsChangingPassword(false);
      
      // You could add a toast notification here
      alert("Password changed successfully!");
      
    } catch (error: any) {
      // Handle API errors
      const errorMessage = error?.response?.data?.message || "Failed to change password. Please try again.";
      setPasswordErrors({ general: errorMessage });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors({});
    setPasswordVisibility({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
  };

  return (
    <Dialog
      isOpen={getQuery("is_profile") === "true"}
      onClose={() => removeQuery("is_profile")}
      title="User Profile"
    >
      <div className="space-y-6">
        {/* Brand Badge */}
        {brandId && (
          <div className="flex justify-end">
            <span className="inline-block text-xs sm:text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold shadow-sm">
              Brand: {brand.name}
            </span>
            <span className="ml-2 inline-block text-xs sm:text-sm bg-[var(--color-surface)] text-[var(--color-on-surface)] opacity-80 px-3 py-1 rounded-full font-semibold shadow-sm">
              ID: {brandId.split("-")[0].toUpperCase() || "N/A"}
            </span>
          </div>
        )}

        {/* Profile Header */}
        <div className="flex items-center gap-6 border-b border-[var(--color-muted)] border-opacity-30 pb-6">
          <Avatar name={user?.name || "User"} />
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-on-background)]">
              {user?.name || "User Name"}
            </h2>
            <p className="text-[var(--color-on-surface)] opacity-70 text-sm">{user?.email}</p>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="text-sm text-[var(--color-on-surface)] opacity-80 leading-relaxed">
          Welcome to your profile page. Here you can manage your account
          settings, view your activity log, and more.
        </div>

        {/* Security Section */}
        <div className="border-t border-[var(--color-muted)] border-opacity-30 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--color-on-background)]">Security</h3>
            {!isChangingPassword && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChangingPassword(true)}
              >
                Change Password
              </Button>
            )}
          </div>

          {isChangingPassword ? (
            <div className="bg-[var(--color-background)] rounded-lg p-6">
              <h4 className="text-md font-medium text-[var(--color-on-background)] mb-4">Change Password</h4>
              
              {passwordErrors.general && (
                <div className="mb-4 p-3 bg-[var(--color-error)] bg-opacity-10 border  border-[var(--color-error)] border-opacity-30 rounded-md">
                  <p className="text-sm text-[var(--color-on-error)]">{passwordErrors.general}</p>
                </div>
              )}

              <form onSubmit={handleSubmitPasswordChange} className="space-y-4">
                <Input
                  type={passwordVisibility.currentPassword ? "text" : "password"}
                  label="Current Password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                  error={passwordErrors.currentPassword}
                  rightIcon={renderPasswordIcon("currentPassword")}
                  required
                  autoComplete="current-password"
                />

                <Input
                  type={passwordVisibility.newPassword ? "text" : "password"}
                  label="New Password"
                  value={passwordForm.newPassword}
                  onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                  error={passwordErrors.newPassword}
                  rightIcon={renderPasswordIcon("newPassword")}
                  helperText="Must be at least 8 characters long"
                  required
                  autoComplete="new-password"
                />

                <div>
                  <Input
                    type={passwordVisibility.confirmPassword ? "text" : "password"}
                    label="Confirm New Password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                    error={passwordErrors.confirmPassword}
                    rightIcon={renderPasswordIcon("confirmPassword")}
                    required
                    autoComplete="new-password"
                  />
                  {renderPasswordMatchIndicator()}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isPasswordLoading}
                    disabled={isPasswordLoading}
                  >
                    Update Password
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancelPasswordChange}
                    disabled={isPasswordLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-[var(--color-background)] rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-on-background)]">Password</p>
                <p className="text-sm text-[var(--color-on-surface)] opacity-70">Last updated: Not available</p>
              </div>
              <div className="text-sm text-[var(--color-on-surface)] opacity-70">••••••••</div>
            </div>
          )}
        </div>

        {/* User Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-[var(--color-on-surface)] opacity-70 mb-1">User ID</p>
            <p className="text-sm font-medium text-[var(--color-on-background)]">
              #{user?.id.split("-")[0].toUpperCase() || "N/A"}
            </p>
          </div>
          {!isOtherRoles(user?.role) && (
            <div className="bg-white border border-[var(--color-muted)] border-opacity-20 rounded-lg p-4 shadow-sm">
              <p className="text-xs text-[var(--color-on-surface)] opacity-70 mb-1">Role</p>
              <p className="text-sm font-medium text-[var(--color-on-background)]">
                {user?.role?.join(", ") || "N/A"}
              </p>
            </div>
          )}
          <div className="sm:col-span-2 bg-white border border-[var(--color-muted)] border-opacity-20 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-[var(--color-on-surface)] opacity-70 mb-1">Permissions</p>
            <p className="text-sm font-medium text-[var(--color-on-background)] break-words whitespace-pre-wrap">
              {user?.permissions?.join(", ") || "N/A"}
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
