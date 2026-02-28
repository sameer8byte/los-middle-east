import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQueryParams } from "../../../hooks/useQueryParams";
import Dialog from "../../../common/dialog";
import {
  FiUser,
  FiKey,
  FiShield,
  FiCalendar,
  FiHash,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiCopy,
} from "react-icons/fi";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { getUserRolesAndPermissions } from "../../../shared/services/api/partner-user.api";
import { PartnerUser } from "../../../shared/types/partnerUser";

export function ViewDetails() {
  const { brandId } = useParams();
  const { getQuery, removeQuery } = useQueryParams();
  const [partnerUser, setPartnerUser] = useState<PartnerUser | null>(null);
  const partnerUserId = getQuery("viewPartnerUserId");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "roles" | "permissions"
  >("overview");

  useEffect(() => {
    const fetchData = async () => {
      if (!brandId || !partnerUserId) return;
      setIsLoading(true);

      try {
        const userData = await getUserRolesAndPermissions(
          partnerUserId,
          brandId
        );
        if (userData) {
          setPartnerUser(userData);
        } else {
          setError("No data found");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load required data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [brandId, partnerUserId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateCompact = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (isActive: boolean, deletedAt: string | null) => {
    if (deletedAt) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)]">
          <FiXCircle className="w-3 h-3" />
          Deleted
        </span>
      );
    }
    return isActive ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)]">
        <FiCheckCircle className="w-3 h-3" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-warning)]">
        <FiXCircle className="w-3 h-3" />
        Inactive
      </span>
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const TabButton = ({
    label,
    count,
    isActive,
    onClick,
  }: {
    id: string;
    label: string;
    count?: number;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`relative px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-[var(--color-primary)] text-black"
          : "bg-[var(--secondary-bg)] text-[#212529]"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
            isActive
              ? "bg-white bg-opacity-20 text-[#212529]"
              : "bg-[var(--secondary-bg)] text-[var(--muted-foreground)]"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );

  return (
    <Dialog
      isOpen={!!partnerUserId}
      onClose={() => {
        removeQuery("viewPartnerUserId");
        setPartnerUser(null);
        setError(null);
        setIsLoading(false);
      }}
      title="User Details"
    >
      <div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--border)]"></div>
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--color-primary)] border-t-transparent absolute top-0 left-0"></div>
            </div>
            <p className="text-[var(--muted-foreground)] mt-4 text-base font-medium">
              Loading user details...
            </p>
            <p className="text-[var(--muted-foreground)]/70 text-sm mt-1">
              Please wait while we fetch the information
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="bg-[var(--color-error)] bg-opacity-10 rounded-full p-3 mb-4">
              <HiOutlineExclamationCircle className="h-10 w-10 text-[var(--color-on-error)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
              Something went wrong
            </h3>
            <p className="text-[var(--muted-foreground)] text-center text-sm max-w-md">
              {error}
            </p>
          </div>
        ) : partnerUser ? (
          <div className="h-full flex flex-col">
            {/* Compact Header */}
            <div className="bg-white border-b border-[var(--border)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                    <FiUser className="w-5 h-5 text-[var(--color-on-primary)]" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-[var(--foreground)]">
                      {partnerUser.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {partnerUser.email}
                      </span>
                      {getStatusBadge(
                        partnerUser.isActive,
                        partnerUser.deletedAt
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-base font-semibold text-[#212529]">
                      {partnerUser.brandRoles.length}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
                      Roles
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-semibold text-[#212529]">
                      {partnerUser.userPermissions.length}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
                      Permissions
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center  gap-2 mt-4">
                <TabButton
                  id="overview"
                  label="Overview"
                  isActive={activeTab === "overview"}
                  onClick={() => setActiveTab("overview")}
                />
                <TabButton
                  id="roles"
                  label="Roles"
                  count={partnerUser.brandRoles.length}
                  isActive={activeTab === "roles"}
                  onClick={() => setActiveTab("roles")}
                />
                <TabButton
                  id="permissions"
                  label="Permissions"
                  count={partnerUser.userPermissions.length}
                  isActive={activeTab === "permissions"}
                  onClick={() => setActiveTab("permissions")}
                />
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Quick Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <FiHash className="w-4 h-4 text-[var(--muted-foreground)]" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
                            User ID
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="font-mono text-xs text-[var(--foreground)] truncate">
                              {partnerUser.id}
                            </span>
                            <button
                              onClick={() => copyToClipboard(partnerUser.id)}
                              className="p-1 hover:bg-[var(--secondary-bg)] rounded transition-colors"
                            >
                              <FiCopy className="w-3 h-3 text-[var(--muted-foreground)]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="w-4 h-4 text-[var(--muted-foreground)]" />
                        <div>
                          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
                            Created
                          </div>
                          <div className="text-xs text-[var(--foreground)] mt-0.5">
                            {formatDateCompact(partnerUser.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <FiClock className="w-4 h-4 text-[var(--muted-foreground)]" />
                        <div>
                          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
                            Last Updated
                          </div>
                          <div className="text-xs text-[var(--foreground)] mt-0.5">
                            {formatDateCompact(partnerUser.updatedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Information */}
                  <div className="bg-white rounded-lg border border-[var(--border)]">
                    <div className="p-3 border-b border-[var(--border)]">
                      <h3 className="text-sm font-medium text-[var(--foreground)]">
                        Account Information
                      </h3>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-[var(--muted-foreground)]">
                          Full Name
                        </span>
                        <span className="text-sm text-[var(--foreground)] font-medium">
                          {partnerUser.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-[var(--muted-foreground)]">
                          Email Address
                        </span>
                        <span className="text-sm text-[var(--foreground)]">
                          {partnerUser.email}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-[var(--muted-foreground)]">
                          Account Status
                        </span>
                        {getStatusBadge(
                          partnerUser.isActive,
                          partnerUser.deletedAt
                        )}
                      </div>
                      {partnerUser.deletedAt && (
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-sm text-[var(--muted-foreground)]">
                            Deleted At
                          </span>
                          <span className="text-sm text-[var(--color-on-error)]">
                            {formatDate(partnerUser.deletedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-[var(--border)]">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-[var(--foreground)]">
                          Roles Summary
                        </h4>
                        <span className="text-xs bg-[var(--secondary-bg)] text-[var(--muted-foreground)] px-2 py-0.5 rounded">
                          {partnerUser.brandRoles.length}
                        </span>
                      </div>
                      {partnerUser.brandRoles.length > 0 ? (
                        <div className="space-y-1.5">
                          {partnerUser.brandRoles
                            .slice(0, 2)
                            .map((role, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <FiShield className="w-3 h-3 text-[var(--muted-foreground)]" />
                                <span className="text-sm text-[var(--foreground)]">
                                  {role.role.name}
                                </span>
                              </div>
                            ))}
                          {partnerUser.brandRoles.length > 2 && (
                            <div className="text-xs text-[var(--muted-foreground)]">
                              +{partnerUser.brandRoles.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-[var(--muted-foreground)]">
                          No roles assigned
                        </div>
                      )}
                    </div>
                    {/* 
                    <div className="bg-white rounded-lg p-4 border border-[var(--color-muted)] border-opacity-30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-[var(--color-on-background)]">Permissions Summary</h4>
                        <span className="text-xs bg-[var(--color-surface)] px-2 py-1 rounded">{partnerUser.userPermissions.length}</span>
                      </div>
                      {partnerUser.userPermissions.length > 0 ? (
                        <div className="space-y-2">
                          {partnerUser.userPermissions.slice(0, 2).map((perm, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <FiKey className="w-3 h-3 text-[var(--color-on-surface)] opacity-50" />
                              <span className="text-sm text-[var(--color-on-surface)] opacity-80">{perm.partnerPermission.name}</span>
                            </div>
                          ))}
                          {partnerUser.userPermissions.length > 2 && (
                            <div className="text-xs text-[var(--color-on-surface)] opacity-70">+{partnerUser.userPermissions.length - 2} more</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-[var(--color-on-surface)] opacity-70">No direct permissions</div>
                      )}
                    </div> */}
                  </div>
                </div>
              )}

              {activeTab === "roles" && (
                <div className="space-y-3">
                  {partnerUser.brandRoles.length > 0 ? (
                    partnerUser.brandRoles.map((roleItem, index) => (
                      <div
                        key={index}
                        className="bg-white border border-[var(--border)] rounded-lg p-3 hover:border-[var(--color-primary)] transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 bg-[var(--secondary-bg)] rounded-lg flex items-center justify-center">
                            <FiShield className="w-4 h-4 text-[var(--muted-foreground)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-[var(--foreground)]">
                              {roleItem.role.name}
                            </h3>
                            {roleItem.role.description && (
                              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                                {roleItem.role.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-[var(--muted-foreground)]">
                                  Brand:
                                </span>
                                <span className="text-xs font-mono bg-[var(--secondary-bg)] px-1.5 py-0.5 rounded">
                                  {roleItem.brandId}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-[var(--muted-foreground)]">
                                  Role ID:
                                </span>
                                <span className="text-xs font-mono bg-[var(--secondary-bg)] px-1.5 py-0.5 rounded">
                                  {roleItem.roleId}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <FiShield className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
                      <h3 className="text-base font-medium text-[var(--foreground)] mb-1">
                        No Roles Assigned
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        This user hasn't been assigned any roles yet.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "permissions" && (
                <div className="space-y-3">
                  {partnerUser.userPermissions.length > 0 ? (
                    partnerUser.userPermissions.map((perm, index) => (
                      <div
                        key={index}
                        className="bg-white border border-[var(--border)] rounded-lg p-3 hover:border-[var(--color-primary)] transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 bg-[var(--secondary-bg)] rounded-lg flex items-center justify-center">
                            <FiKey className="w-4 h-4 text-[var(--muted-foreground)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm text-[var(--foreground)]">
                                {perm.partnerPermission.name}
                              </h3>
                              <span className="text-xs bg-[var(--color-primary)] bg-opacity-15 text-[var(--color-on-primary)] px-1.5 py-0.5 rounded-full">
                                {perm.partnerPermissionType}
                              </span>
                            </div>
                            {perm.partnerPermission.description && (
                              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                                {perm.partnerPermission.description}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-1.5">
                              <span className="text-xs text-[var(--muted-foreground)]">
                                Permission ID:
                              </span>
                              <span className="text-xs font-mono bg-[var(--secondary-bg)] px-1.5 py-0.5 rounded">
                                {perm.partnerPermissionId}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <FiKey className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
                      <h3 className="text-base font-medium text-[var(--foreground)] mb-1">
                        No Direct Permissions
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        This user doesn't have any direct permissions granted.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <></>
        )}
      </div>
    </Dialog>
  );
}
export default ViewDetails;