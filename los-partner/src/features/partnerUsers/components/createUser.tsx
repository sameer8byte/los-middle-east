import React, { useEffect, useState } from "react";
import Dialog from "../../../common/dialog";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { useParams } from "react-router-dom";
import { Spinner } from "../../../common/ui/spinner";
import {
  FiEyeOff,
  FiShield,
  FiCheck,
  FiChevronDown,
} from "react-icons/fi";
import { FaEye } from "react-icons/fa";
import { PartnerUserPermissionType } from "../../../constant/enum";
import {
  createOrUpdateBrandUser,
  getBrandRolesAndPermissions,
  getUserRolesAndPermissions,
  getSupervisorUsers,
  getCollectionSupervisorUsers,
} from "../../../shared/services/api/partner-user.api";
import { RolesAndPermissions } from "../../../shared/types/partnerUser";
import { Button } from "../../../common/ui/button";
import { useAppSelector } from "../../../shared/redux/store";
import { isAdmin, isSuperAdmin } from "../../../lib/role";

// Updated interface to include permission types
interface PermissionWithType {
  permissionId: number;
  permissionType: PartnerUserPermissionType;
}
export interface SupervisorUser {
  id: string;
  name: string;
  email: string;
  brandRoles: Array<{
    role: {
      name: string;
    };
  }>;
}


const initialFormState = {
  email: "",
  password: "",
  name: "",
  phone_number: "",
  role: "",
  permissions: [] as PermissionWithType[], // Updated to include permission types
  reportsToId: "",
  isReloanSupport: false,
  is_fresh_loan_support: true,
};

export function CreateUser() {
  const { brandId } = useParams();

  const { getQuery, removeQuery } = useQueryParams();
  const partnerUserId = getQuery("editPartnerUserId");

  const [rolesAndPermissions, setRolesAndPermissions] =
    useState<RolesAndPermissions>({
      roles: [],
      permissions: [],
    });
  const [supervisorUsers, setSupervisorUsers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      brandRoles: Array<{ role: { name: string } }>;
    }>
  >([]);

  // Get current user's role from Redux
  const currentUserRoles = useAppSelector((state) => state.auth.data?.role) || [];
  const canEditRole = isAdmin(currentUserRoles) || isSuperAdmin(currentUserRoles);

  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number | undefined>>(new Set());

  const isEditMode = !!partnerUserId;

  const toggleGroupExpand = (groupId: number | undefined) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePasswordInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setChangePasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePasswordToggle = () => {
    setShowChangePassword(!showChangePassword);
    setChangePasswordData({ newPassword: "", confirmPassword: "" });
  };

  // Updated permission change handler to include permission types
  const handlePermissionChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { value, checked } = event.target;
    const numericValue = Number(value);

    setFormData((prev) => ({
      ...prev,
      permissions: checked
        ? [
            ...prev.permissions,
            {
              permissionId: numericValue,
              permissionType: PartnerUserPermissionType.ALL,
            },
          ]
        : prev.permissions.filter((p) => p.permissionId !== numericValue),
    }));
  };

  // New handler for permission type changes
  // Removed as Access Level UI has been removed

  // Helper function to check if permission is selected
  const isPermissionSelected = (permissionId: number): boolean => {
    return formData.permissions.some((p) => p.permissionId === permissionId);
  };

  // Group permissions by permission_group_id
  const groupedPermissions = React.useMemo(() => {
    const groups: Map<number | undefined, typeof rolesAndPermissions.permissions> = new Map();
    
    rolesAndPermissions.permissions.forEach((permission) => {
      const groupId = permission.permission_group_id ?? permission.permissionGroupId;
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(permission);
    });

    return Array.from(groups.entries())
      .sort((a, b) => {
        // Ungrouped (undefined) go first
        if (a[0] === undefined) return -1;
        if (b[0] === undefined) return 1;
        return a[0] - b[0];
      })
      .map(([groupId, permissions]) => ({
        groupId,
        permissions,
      }));
  }, [rolesAndPermissions.permissions]);

  // Check if all permissions in a group are selected
  const isGroupFullySelected = (groupId: number | undefined): boolean => {
    const groupPermissions = groupedPermissions.find(
      (g) => g.groupId === groupId
    )?.permissions || [];
    return (
      groupPermissions.length > 0 &&
      groupPermissions.every((p) => isPermissionSelected(p.id))
    );
  };

  // Handle selecting/deselecting all permissions in a group
  const handleGroupToggle = (groupId: number | undefined) => {
    const groupPermissions = groupedPermissions.find(
      (g) => g.groupId === groupId
    )?.permissions || [];
    const isFullySelected = isGroupFullySelected(groupId);

    setFormData((prev) => {
      if (isFullySelected) {
        // Deselect all in group
        return {
          ...prev,
          permissions: prev.permissions.filter(
            (p) => !groupPermissions.some((gp) => gp.id === p.permissionId)
          ),
        };
      } else {
        // Select all in group
        const existingIds = new Set(prev.permissions.map((p) => p.permissionId));
        const newPermissions = groupPermissions
          .filter((p) => !existingIds.has(p.id))
          .map((p) => ({
            permissionId: p.id,
            permissionType: PartnerUserPermissionType.ALL,
          }));
        return {
          ...prev,
          permissions: [...prev.permissions, ...newPermissions],
        };
      }
    });
  };

  // Filter supervisors based on selected role
  const filteredSupervisors = React.useMemo(() => {
    if (formData.role === "CREDIT_EXECUTIVE") {
      return supervisorUsers.filter((user) =>
        user.brandRoles.some(
          (br) =>
            br.role.name === "SANCTION_MANAGER" ||
            br.role.name === "SANCTION_HEAD"
        )
      );
    }
    if (formData.role === "COLLECTION_EXECUTIVE") {
      return supervisorUsers.filter((user) =>
        user.brandRoles.some(
          (br) =>
            br.role.name === "COLLECTION_MANAGER" ||
            br.role.name === "COLLECTION_HEAD"
        )
      );
    }
    return [];
  }, [supervisorUsers, formData.role]);

  // Get checkbox state class for group header
  // Removed - no longer needed with native checkboxes

  const onClose = () => {
    if (getQuery("createPartnerUser")) removeQuery("createPartnerUser");
    if (getQuery("editPartnerUserId")) removeQuery("editPartnerUserId");
    setFormData(initialFormState);
    setChangePasswordData({ newPassword: "", confirmPassword: "" });
    setShowChangePassword(false);
    setShowPermissions(false);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!brandId) return;

    try {
      setError(null);
      setIsSubmitting(true);

      if (!isEditMode && !formData.password) {
        setError("Password is required for new users");
        return;
      }

      // Password validation for edit mode
      if (isEditMode && showChangePassword) {
        if (!changePasswordData.newPassword) {
          setError("New password is required");
          return;
        }
        if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        if (changePasswordData.newPassword.length < 8) {
          setError("Password should be at least 8 characters long");
          return;
        }
      }

      const role = rolesAndPermissions.roles.find(
        (r) => r.name === formData.role
      );

      if (!role) {
        setError("Please select a valid role");
        return;
      }

      // Validate reportsToId for CREDIT_EXECUTIVE role
      if (
        (role.name === "CREDIT_EXECUTIVE" ||
          role.name === "COLLECTION_EXECUTIVE") &&
        !formData.reportsToId
      ) {
        setError(`Report To field is mandatory for ${role.name.replace(/_/g, " ")} role`);
        return;
      }

      const payload: any = {
        email: formData.email,
        name: formData.name,
        phone_number: formData.phone_number || undefined,
        brandId,
        roleId: role.id,
        permissions: formData.permissions
          .filter((p) =>
            rolesAndPermissions.permissions.some(
              (perm) => perm.id === p.permissionId
            )
          )
          .map((p) => ({
            permissionId: p.permissionId,
            permissionType: p.permissionType,
          })),
        reportsToId: formData.reportsToId || undefined,
        isReloanSupport: role.name === "CREDIT_EXECUTIVE" ? formData.isReloanSupport : undefined,
        is_fresh_loan_support: role.name === "CREDIT_EXECUTIVE" ? formData.is_fresh_loan_support : undefined,
      };

      // Add password for new users or password change
      if (!isEditMode) {
        payload.password = formData.password;
      } else if (showChangePassword) {
        payload.password = changePasswordData.newPassword;
      }

      await createOrUpdateBrandUser(brandId, partnerUserId || null, payload);
      onClose();
    } catch (err) {
      console.error("Operation failed:", err);
      setError(
        (err as Error).message || "Failed to save user. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const isDialogOpen = getQuery("createPartnerUser") === "true" || isEditMode;

  useEffect(() => {
    if (isDialogOpen) {
      setShowPermissions(false);
    }
  }, [isDialogOpen]);
  useEffect(() => {
    const fetchData = async () => {
      if (!brandId) return;
      setIsLoading(true);

      try {
        const [rolesData, creditSupervisors, collectionSupervisors] =
          await Promise.all([
          getBrandRolesAndPermissions(brandId),
          getSupervisorUsers(brandId),
          getCollectionSupervisorUsers(brandId).catch(() => []),
        ]);

        let userData = null;
        if (isEditMode && partnerUserId) {
          userData = await getUserRolesAndPermissions(partnerUserId, brandId);
        }

        // Combine and deduplicate supervisors from both sources
        const allSupervisorsMap = new Map <string,SupervisorUser>();
        (creditSupervisors || []).forEach((s :SupervisorUser) => allSupervisorsMap.set(s.id, s));
        (collectionSupervisors || []).forEach((s :SupervisorUser) => allSupervisorsMap.set(s.id, s));

        setRolesAndPermissions(rolesData);
        setSupervisorUsers(Array.from(allSupervisorsMap.values()));

        if (userData) {
          setFormData({
            email: userData.email,
            password: userData.password, // Password never shown in edit mode
            name: userData.name,
            phone_number: userData.phone_number || "",
            role: userData.brandRoles[0]?.role.name || "",
            permissions: userData.userPermissions.map(
              (perm: {
                partnerPermission: { id: number };
                partnerPermissionType: PartnerUserPermissionType;
              }) => ({
                permissionId: perm.partnerPermission.id,
                permissionType:
                  perm.partnerPermissionType || PartnerUserPermissionType.ALL,
              })
            ),
            reportsToId: userData.reportsToId || "",
            isReloanSupport: userData.isReloanSupport || false,
            is_fresh_loan_support: userData.is_fresh_loan_support ?? true,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load required data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [brandId, partnerUserId, isEditMode]);


  return (
    <Dialog
      isOpen={getQuery("createPartnerUser") === "true" || isEditMode}
      onClose={() => {
        onClose();
      }}
      title={isEditMode ? "Edit User" : "Create User"}
    >
      <form onSubmit={handleSubmit} autoComplete="off">
       

        {isLoading ? (
          <div className="space-y-8">
            {/* Loading skeleton */}
            {[...Array(5)].map((_: any, idx) => (
              <div key={idx} className="space-y-3">
                <div className="h-4 w-32 bg-[var(--secondary-bg)] rounded-lg animate-pulse"></div>
                <div className="h-12 bg-[var(--secondary-bg)] rounded-xl animate-pulse"></div>
              </div>
            ))}

            <div className="space-y-3">
              <div className="h-4 w-24 bg-[var(--secondary-bg)] rounded-lg animate-pulse"></div>
              <div className="grid grid-cols-2 gap-4">
                {[...Array(6)].map((_: any, idx) => (
                  <div
                    key={idx}
                    className="h-10 bg-[var(--secondary-bg)] rounded-lg animate-pulse"
                  ></div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-[var(--border)]">
              <div className="h-11 w-24 bg-[var(--secondary-bg)] rounded-xl animate-pulse"></div>
              <div className="h-11 w-32 bg-[var(--secondary-bg)] rounded-xl animate-pulse"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Personal Information Section */}
            <div>
              <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-widest mb-3 pl-1">
                Personal Details
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label htmlFor="fullName" className="text-xs font-medium text-[var(--foreground)]">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]"
                      placeholder="John Doe"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-xs font-medium text-[var(--foreground)]">
                      Email <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]"
                      placeholder="user@example.com"
                      disabled={isEditMode}
                      autoComplete="off"
                    />
                    {isEditMode && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        Cannot be changed
                      </p>
                    )}
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label htmlFor="phone_number" className="text-xs font-medium text-[var(--foreground)]">
                    Phone Number
                  </label>
                  <input
                    id="phone_number"
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]"
                    placeholder="10-digit phone number"
                    maxLength={10}
                  />
                </div>

                {/* Password Row */}
                {!isEditMode && (
                  <div className="space-y-1">
                    <label htmlFor="password" className="text-xs font-medium text-[var(--foreground)]">
                      Password <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]"
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      >
                        {showPassword ? (
                          <FiEyeOff className="w-4 h-4" />
                        ) : (
                          <FaEye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Change Password Section - Only in edit mode */}
                {isEditMode && (
                  <div className="space-y-2 p-3 bg-gradient-to-br from-[var(--secondary-bg)] to-[var(--secondary-bg)]/80 rounded-lg border border-[var(--border)] hover:border-[var(--primary)]/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <label htmlFor="updatePwd" className="text-xs font-medium text-[var(--foreground)]">
                        Update Password
                      </label>
                      <button
                        type="button"
                        onClick={handleChangePasswordToggle}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                          showChangePassword
                            ? "bg-[var(--destructive)]/10 text-[var(--destructive)] border border-[var(--destructive)]/30"
                            : "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 hover:border-[var(--primary)]/60"
                        }`}
                      >
                        {showChangePassword ? "Cancel" : "Change"}
                      </button>
                    </div>

                    {showChangePassword && (
                      <div className="space-y-2.5 pt-2 grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label htmlFor="newPassword" className="text-xs font-medium text-[var(--foreground)]">
                            New <span className="text-[var(--destructive)]">*</span>
                          </label>
                          <div className="relative">
                            <input
                              id="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              name="newPassword"
                              value={changePasswordData.newPassword}
                              onChange={handleChangePasswordInputChange}
                              className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm"
                              placeholder="Min. 8 chars"
                        autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                            >
                              {showNewPassword ? (
                                <FiEyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <FaEye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="confirmPassword" className="text-xs font-medium text-[var(--foreground)]">
                            Confirm <span className="text-[var(--destructive)]">*</span>
                          </label>
                          <div className="relative">
                            <input
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              name="confirmPassword"
                              value={changePasswordData.confirmPassword}
                              onChange={handleChangePasswordInputChange}
                              className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm"
                              placeholder="Confirm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                            >
                              {showConfirmPassword ? (
                                <FiEyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <FaEye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Role & Permissions Section */}
            <div>
              <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-widest mb-3 pl-1">
                Access Control
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* User Role */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--foreground)]">
                      Role <span className="text-[var(--destructive)]">*</span>
                    </label>
                    {isEditMode && !canEditRole ? (
                      <div className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--secondary-bg)] text-sm text-[var(--foreground)] flex items-center">
                        <span className="inline-block w-2 h-2 bg-[var(--primary)] rounded-full mr-2"></span>
                        {formData.role}
                      </div>
                    ) : (
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm text-[var(--foreground)] appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.75rem center',
                          paddingRight: '2rem'
                        }}
                      >
                        <option value="">Select role</option>
                        {rolesAndPermissions.roles
                          .filter(
                            (role) =>
                              role.name !== "SUPER_ADMIN" && role.name !== "ADMIN"
                          )
                          .map((role) => (
                            <option key={role.id} value={role.name}>
                              {role.name.replace(/_/g, " ")}
                            </option>
                          ))}
                      </select>
                    )}
                    {isEditMode && !canEditRole && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        Read-only
                      </p>
                    )}
                  </div>

                  {/* Report To - For CREDIT_EXECUTIVE and COLLECTION_EXECUTIVE */}
                  {formData.role === "CREDIT_EXECUTIVE" ||
                  formData.role === "COLLECTION_EXECUTIVE" ? (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[var(--foreground)]">
                        Report To <span className="text-[var(--destructive)]">*</span>
                      </label>
                      <select
                        name="reportsToId"
                        value={formData.reportsToId}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm text-[var(--foreground)] appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.75rem center',
                          paddingRight: '2rem'
                        }}
                      >
                        <option value="">Select supervisor</option>
                        {filteredSupervisors.map((supervisor) => (
                          <option key={supervisor.id} value={supervisor.id}>
                            {supervisor.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>

                {/* Loan Support Toggles - Only for CREDIT_EXECUTIVE */}
                {formData.role === "CREDIT_EXECUTIVE" && (
                  <div className="space-y-2">
                    {/* Fresh Loan Support Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-br from-[var(--secondary-bg)] to-[var(--secondary-bg)]/80 rounded-lg border border-[var(--border)] hover:border-[var(--primary)]/40 transition-colors">
                      <div className="flex-1">
                        <label htmlFor="is_fresh_loan_support" className="text-xs font-medium text-[var(--foreground)]">
                          Fresh Loan Support
                        </label>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          Enable fresh loan support for this user
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.is_fresh_loan_support}
                        onClick={() => setFormData(prev => ({ ...prev, is_fresh_loan_support: !prev.is_fresh_loan_support }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
                          formData.is_fresh_loan_support ? 'bg-[var(--primary)]' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            formData.is_fresh_loan_support ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Reloan Support Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-br from-[var(--secondary-bg)] to-[var(--secondary-bg)]/80 rounded-lg border border-[var(--border)] hover:border-[var(--primary)]/40 transition-colors">
                      <div className="flex-1">
                        <label htmlFor="isReloanSupport" className="text-xs font-medium text-[var(--foreground)]">
                          Reloan Support
                        </label>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          Enable reloan support for this user
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.isReloanSupport}
                        onClick={() => setFormData(prev => ({ ...prev, isReloanSupport: !prev.isReloanSupport }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
                          formData.isReloanSupport ? 'bg-[var(--primary)]' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            formData.isReloanSupport ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Permissions Section */}
                <div className="rounded-lg border border-[var(--border)] bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <button
                    type="button"
                    onClick={() => setShowPermissions(!showPermissions)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--secondary-bg)]/50 transition-colors group"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-2 h-2 bg-[var(--primary)] rounded-full group-hover:scale-125 transition-transform"></div>
                      <div className="text-left">
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          Permissions
                        </span>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {formData.permissions.length}/{rolesAndPermissions.permissions.length} selected
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {formData.permissions.length > 0 && (
                        <div className="inline-flex items-center px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded text-xs font-medium">
                          {formData.permissions.length}
                        </div>
                      )}
                      <FiChevronDown
                        className={`w-4 h-4 text-[var(--foreground)] transform transition-transform duration-300 ${
                          showPermissions ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Collapsible Content */}
                  {showPermissions && (
                    <div className="border-t border-[var(--border)] bg-white">
                      {/* Header */}
                      <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--border)] bg-white">
                        <span className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-widest">
                          Manage
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setFormData((prev) => ({
                              ...prev,
                              permissions:
                                prev.permissions.length ===
                                rolesAndPermissions.permissions.length
                                  ? []
                                  : rolesAndPermissions.permissions.map((p) => ({
                                      permissionId: p.id,
                                      permissionType:
                                        PartnerUserPermissionType.ALL,
                                    })),
                            }));
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 rounded-md hover:bg-[var(--primary)]/20 transition-colors border border-[var(--primary)]/30"
                        >
                          {formData.permissions.length ===
                          rolesAndPermissions.permissions.length
                            ? "Clear"
                            : "All"}
                        </button>
                      </div>

                      <div className="max-h-[480px] overflow-y-auto">
                        {rolesAndPermissions.permissions.length === 0 ? (
                          <div className="text-center py-8">
                            <FiShield className="w-6 h-6 mx-auto mb-2 text-[var(--muted-foreground)] opacity-40" />
                            <p className="text-xs text-[var(--muted-foreground)]">
                              No permissions available
                            </p>
                          </div>
                        ) : (
                          <div className="pb-3">
                            {groupedPermissions.map((group) => (
                              <div key={group.groupId || "ungrouped"}>
                                {/* Group Header */}
                                <div className="sticky top-0 z-10 bg-white px-3 pt-3 pb-1.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleGroupExpand(group.groupId)}
                                    className="w-full flex items-center space-x-2 px-2 py-1.5 bg-[var(--secondary-bg)] rounded-md border border-[var(--border)] hover:border-[var(--primary)]/40 transition-colors group"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isGroupFullySelected(group.groupId)}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleGroupToggle(group.groupId);
                                      }}
                                      className="w-4 h-4 rounded cursor-pointer accent-[var(--primary)]"
                                    />
                                    <span className="text-xs font-semibold text-[var(--foreground)] flex-1 text-left">
                                      {group.groupId
                                        ? `Group ${group.groupId}`
                                        : "Other"}
                                    </span>
                                    <span className="text-xs text-[var(--muted-foreground)] bg-white px-1.5 py-0.5 rounded text-center min-w-[32px]">
                                      {group.permissions.filter((p) =>
                                        isPermissionSelected(p.id)
                                      ).length}/{group.permissions.length}
                                    </span>
                                    <FiChevronDown
                                      className={`w-3.5 h-3.5 text-[var(--foreground)] transform transition-transform duration-200 flex-shrink-0 ${
                                        expandedGroups.has(group.groupId) ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>
                                </div>

                                {/* Permissions Grid - 2 columns - Collapsible */}
                                {expandedGroups.has(group.groupId) && (
                                  <div className="grid grid-cols-2 gap-1.5 px-3 pb-1">
                                    {group.permissions.map((permission) => (
                                      <label
                                        key={permission.id}
                                        className="flex items-start space-x-2 p-2 rounded-md hover:bg-[var(--primary)]/5 cursor-pointer transition-all group"
                                      >
                                        <input
                                          type="checkbox"
                                          name="permissions"
                                          value={permission.id}
                                          checked={isPermissionSelected(
                                            permission.id
                                          )}
                                          onChange={handlePermissionChange}
                                          className="w-4 h-4 rounded mt-0.5 cursor-pointer accent-[var(--primary)] flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                                            {String(permission.name)
                                              .replace(/_/g, " ")
                                              .toLowerCase()
                                              .replace(/\b\w/g, (char: string) =>
                                                char.toUpperCase()
                                              )}
                                          </p>
                                          {permission.description && (
                                            <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">
                                              {permission.description}
                                            </p>
                                          )}
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
                <div className="p-3 bg-[var(--destructive)]/5 border border-[var(--destructive)]/30 rounded-lg flex items-start space-x-3">
                  <div className="w-5 h-5 bg-[var(--destructive)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <p className="text-[var(--destructive)] text-xs font-medium leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-[var(--border)]">
              <Button
                type="button"
                variant='outline'
                onClick={onClose}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-xs font-medium text-[var(--foreground)] hover:bg-[var(--secondary-bg)]/70 hover:border-[var(--border)] transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="secondary"
                disabled={isSubmitting || isLoading}
                className="px-5 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-semibold hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1.5 shadow-sm hover:shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FiCheck className="w-3.5 h-3.5" />
                    <span>{isEditMode ? "Save" : "Create"}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Dialog>
  );
}