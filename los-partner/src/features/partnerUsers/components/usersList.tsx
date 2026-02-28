import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQueryParams } from "../../../hooks/useQueryParams";
import {
  FiEdit2,
  FiTrash2,
  FiEye,
  FiPlus,
  FiKey,
  FiFileText,
} from "react-icons/fi";
import { BiPhoneCall } from "react-icons/bi";
import {
  getBrandUsers,
  getBrandUserById,
  deleteBrandUser,
  getBrandRoles,
  getBrandPermissions,
} from "../../../shared/services/api/partner-user.api";
import { Pagination } from "../../../shared/types/pagination";
import { Button } from "../../../common/ui/button";
import Avatar from "../../../common/ui/avatar";
import { BrandRole, PartnerUser } from "../../../shared/types/partnerUser";
import {
  Table,
  Pagination as TablePagination,
  SearchInput,
  ErrorMessage,
} from "../../../common/ui/table";
import { usePersistedSearch } from "../../../hooks/usePersistedSearch";
import { formatDateWithTime } from "../../../lib/utils";
import { GenerateSecureCodeModal } from "./generateSecureCodeModal";
import { AuditLogsModal } from "./auditLogsModal";
interface UserListProps {
  readonly onOpenDialerConfig?: (userId: string) => void;
}

function UserList({ onOpenDialerConfig }: UserListProps) {
  const { search } = useLocation();
  const { setQuery, getQuery } = useQueryParams();

  const [users, setUsers] = useState<
    {
      id: string;
      email: string;
      name: string;
      createdAt: string;
      updatedAt: string;
      brandRoles: BrandRole[];
      reportsTo?: {
        id: string;
        name: string;
        email: string;
      } | null;
    }[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const { brandId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissionId, setSelectedPermissionId] = useState<
    number | null
  >(null);

  // Initialize pagination from localStorage to prevent double render
  const [pagination, setPagination] = useState<Pagination>(() => {
    const savedLimit = localStorage.getItem("usersListPageSize");
    const savedPage = localStorage.getItem("usersListPage");
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
      dateFilter: "",
    };
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedPermissions, setExpandedPermissions] = useState<{
    [key: string]: boolean;
  }>({});

  // Modal state for generating secure codes
  const [secureCodeModal, setSecureCodeModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    userEmail: string;
    userRoles: BrandRole[];
  }>({
    isOpen: false,
    userId: "",
    userName: "",
    userEmail: "",
    userRoles: [],
  });

  // Modal state for audit logs
  const [auditLogsModal, setAuditLogsModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    userEmail: string;
  }>({
    isOpen: false,
    userId: "",
    userName: "",
    userEmail: "",
  });

  const queryParams = new URLSearchParams(search);
  const queryObject = Object.fromEntries(queryParams.entries());

  // Use persisted search hook
  const { searchTerm, setSearchTerm } = usePersistedSearch("usersListSearch");

  // Sync search term with URL
  useEffect(() => {
    if (searchTerm) {
      setQuery("search", searchTerm);
    } else {
      const currentSearch = getQuery("search");
      if (currentSearch) {
        setSearchTerm(currentSearch);
      }
    }
  }, []);

  // Fetch roles and permissions on component mount
  useEffect(() => {
    const fetchRolesAndPermissions = async () => {
      try {
        if (!brandId) return;
        const [rolesData, permissionsData] = await Promise.all([
          getBrandRoles(brandId),
          getBrandPermissions(brandId),
        ]);
        setRoles(rolesData);
        setPermissions(permissionsData);
      } catch (err) {
        console.error("Error fetching roles and permissions:", err);
      }
    };
    fetchRolesAndPermissions();
  }, [brandId]);

  const fetchUsers = useCallback(async () => {
    try {
      if (!brandId) {
        navigate("/login");
        return;
      }
      setIsLoading(true);
      setError(null);

      const response = await getBrandUsers(
        brandId,
        {
          page: pagination.page,
          limit: pagination.limit,
          dateFilter: queryObject?.dateFilter,
        },
        searchTerm || selectedRoleId || selectedPermissionId
          ? {
              search: searchTerm || "",
              ...(selectedRoleId && { roleId: selectedRoleId }),
              ...(selectedPermissionId && {
                permissionId: selectedPermissionId,
              }),
            }
          : undefined,
      );
      if (response?.users) {
        // For each user, we need to get detailed info including roles and permissions
        const usersWithDetails = await Promise.all(
          response.users.map(async (user: any) => {
            try {
              const detailedUser = await getBrandUserById(user.id, brandId);
              return {
                ...user,
                ...detailedUser,
                // Ensure we have the basic fields from the list
                name: user.name || detailedUser.name,
                email: user.email || detailedUser.email,
                isActive: detailedUser.isActive ?? true,
              };
            } catch (error) {
              console.error(
                `Error fetching details for user ${user.id}:`,
                error,
              );
              // Return basic user data if detailed fetch fails
              return {
                ...user,
                brandRoles: user.brandRoles || [],
                userPermissions: [],
                isActive: true,
              };
            }
          }),
        );

        setUsers(usersWithDetails);
        setTotalCount(response.meta?.total || usersWithDetails.length);
      } else if (Array.isArray(response)) {
        setUsers(response);
        setTotalCount(response.length);
      } else {
        console.error("Unexpected response structure:", response);
        setUsers([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error("Fetch users error:", error);
      setError(
        (error as Error).message || "Error fetching users. Please try again.",
      );
      setUsers([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    brandId,
    pagination.limit,
    pagination.page,
    queryObject?.dateFilter,
    searchTerm,
    selectedRoleId,
    selectedPermissionId,
  ]);

  useEffect(() => {
    const fetchUsersDebounced = async () => {
      setIsLoading(true);
      setError(null);
      if (!brandId) {
        setError("Brand ID is required");
        setIsLoading(false);
        return;
      }
      try {
        const response = await getBrandUsers(
          brandId,
          {
            page: pagination.page,
            limit: pagination.limit,
            dateFilter: queryObject?.dateFilter,
          },
          {
            search: queryObject.search || "",
            ...(selectedRoleId && { roleId: selectedRoleId }),
            ...(selectedPermissionId && { permissionId: selectedPermissionId }),
          },
        );
        if (response?.users) {
          // For each user, we need to get detailed info including roles and permissions
          const usersWithDetails = await Promise.all(
            response.users.map(async (user: any) => {
              try {
                const detailedUser = await getBrandUserById(user.id, brandId);
                return {
                  ...user,
                  ...detailedUser,
                  // Ensure we have the basic fields from the list
                  name: user.name || detailedUser.name,
                  email: user.email || detailedUser.email,
                  isActive: detailedUser.isActive ?? true,
                };
              } catch (error) {
                console.error(
                  `Error fetching details for user ${user.id}:`,
                  error,
                );
                // Return basic user data if detailed fetch fails
                return {
                  ...user,
                  brandRoles: user.brandRoles || [],
                  userPermissions: [],
                  isActive: true,
                };
              }
            }),
          );

          setUsers(usersWithDetails);
          setTotalCount(response.meta?.total || usersWithDetails.length);
        } else if (Array.isArray(response)) {
          setUsers(response);
          setTotalCount(response.length);
        } else {
          console.error("Unexpected response structure:", response);
          setUsers([]);
          setTotalCount(0);
        }
      } catch (err) {
        setError("Failed to fetch users");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (brandId) fetchUsersDebounced();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [
    brandId,
    pagination,
    JSON.stringify(queryObject),
    selectedRoleId,
    selectedPermissionId,
  ]);

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleView = (userId: string) => {
    setQuery("viewPartnerUserId", userId);
  };

  const handleEdit = (userId: string) => {
    setQuery("editPartnerUserId", userId);
  };

  const handleDelete = async (id: string) => {
    if (!id || !brandId) return;

    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteBrandUser(brandId, id);
      // Refetch users after deletion
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      setError("Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerateSecureCode = (user: any) => {
    setSecureCodeModal({
      isOpen: true,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRoles: user.brandRoles || [],
    });
  };

  const handleViewAuditLogs = (user: any) => {
    setAuditLogsModal({
      isOpen: true,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
    });
  };

  // Memoized calculations
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pagination.limit);
  }, [totalCount, pagination.limit]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setQuery("search", "");
    setSelectedRoleId(null);
    setSelectedPermissionId(null);
  }, [setSearchTerm, setQuery]);

  // Helper function to render permissions
  const renderPermissions = (permissions: any[], roleKey: string) => {
    if (permissions.length === 0) return null;

    const isExpanded = expandedPermissions[roleKey];
    const visiblePermissions = isExpanded
      ? permissions
      : permissions.slice(0, 3);

    return (
      <div className="space-y-1">
        <div className="text-xs font-medium text-[var(--color-on-background)]">
          Permissions ({permissions.length}):
        </div>
        <div className="flex flex-wrap gap-1">
          {visiblePermissions.map((permission: any) => (
            <span
              key={permission.id || permission.name}
              className="text-xs bg-[var(--color-muted)] bg-opacity-30 text-[var(--color-on-surface)] px-1.5 py-0.5 rounded"
              title={permission.description}
            >
              {permission.name}
            </span>
          ))}
        </div>
        {permissions.length > 3 && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedPermissions((prev) => ({
                ...prev,
                [roleKey]: !prev[roleKey],
              }));
            }}
            // className="text-xs px-2 py-1 h-6 mt-1"
          >
            {isExpanded ? "Show Less" : `+${permissions.length - 3} more`}
          </Button>
        )}
      </div>
    );
  };

  // Helper function to render user permissions
  const renderUserPermissions = (userPermissions: any[], userId: string) => {
    if (userPermissions.length === 0) return null;

    const userPermKey = `user-${userId}-permissions`;
    const isExpanded = expandedPermissions[userPermKey];
    const visiblePermissions = isExpanded
      ? userPermissions
      : userPermissions.slice(0, 3);

    return (
      <div className="border border-[var(--color-muted)] border-opacity-30 rounded-lg p-2 bg-[var(--color-surface)]">
        <div className="text-xs font-medium text-[var(--color-on-surface)] mb-1">
          Direct Permissions ({userPermissions.length}):
        </div>
        <div className="flex flex-wrap gap-1">
          {visiblePermissions.map((userPerm: any) => (
            <span
              key={userPerm.partnerPermissionId || userPerm.id}
              className="text-xs bg-[var(--color-secondary-light)] bg-opacity-30 text-[var(--color-on-secondary)] px-1.5 py-0.5 rounded"
              title={userPerm.partnerPermission?.description}
            >
              {userPerm.partnerPermission?.name || userPerm.name}
            </span>
          ))}
        </div>
        {userPermissions.length > 3 && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedPermissions((prev) => ({
                ...prev,
                [userPermKey]: !prev[userPermKey],
              }));
            }}
            className="text-xs px-2 py-1 h-6 mt-1"
          >
            {isExpanded ? "Show Less" : `+${userPermissions.length - 3} more`}
          </Button>
        )}
      </div>
    );
  };

  // Helper function to render a single role
  const renderRole = (brandRole: any) => {
    const role = brandRole.role;
    // Get permissions from role or from user permissions
    const rolePermissions = role?.permissions || [];
    const roleKey = `${
      brandRole.partnerUserId || brandRole.id || role?.id || "role"
    }-${role?.id || "default"}`;

    return (
      <div
        key={roleKey}
        className="border border-[var(--color-muted)] border-opacity-30 rounded-lg p-2 bg-[var(--color-surface)]"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded">
            {role?.name || "Unknown Role"}
          </span>
          <span className="text-xs text-[var(--color-on-surface)] opacity-70">
            ID: {role?.id}
          </span>
        </div>

        {role?.description && (
          <div className="text-xs text-[var(--color-on-surface)] opacity-70 mb-2">
            {role.description}
          </div>
        )}

        {renderPermissions(rolePermissions, roleKey)}

        {brandRole.createdAt && (
          <div className="text-xs text-[var(--color-on-surface)] opacity-60 mt-1">
            Assigned: {formatDateWithTime(brandRole.createdAt)}
          </div>
        )}
      </div>
    );
  };

  // Define table columns
  const columns = useMemo(
    () => [
      {
        key: "userInfo",
        label: "User Details",
        render: (_: any, user: PartnerUser) => {
          return (
            <div className="flex items-start gap-3 min-w-[250px]">
              <Avatar
                name={user.name ? user.name.charAt(0).toUpperCase() : "U"}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[var(--color-on-background)]">
                    {user.name || "No name provided"}
                  </span>
                  {user.isActive ? (
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--color-on-surface)] opacity-70 mb-1">
                  ID: #{user.id.split("-")[0].toUpperCase() || "N/A"}
                </div>
                <div className="text-sm text-[var(--color-on-surface)] opacity-70 mb-1">
                  {user.email}
                </div>
                {user.phone_number && (
                  <div className="text-xs text-[var(--color-on-surface)] opacity-70 flex items-center gap-1">
                    <span>📞</span>
                    <span>{user.phone_number}</span>
                  </div>
                )}
                {!user.phone_number && (
                  <div className="text-xs text-[var(--color-on-surface)] opacity-50 italic">
                    No phone number
                  </div>
                )}
                {/* Debug info - remove in production */}
                <div className="text-xs text-gray-400 mt-1">
                  Roles: {user.brandRoles?.length || 0} | Perms:{" "}
                  {user.userPermissions?.length || 0}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: "roles",
        label: "Roles & Permissions",
        render: (_: any, user: PartnerUser) => {
          const roles = user.brandRoles || [];
          const userPermissions = user.userPermissions || [];

          if (roles.length === 0 && userPermissions.length === 0) {
            return (
              <div className="text-xs text-[var(--color-on-surface)] opacity-70 italic min-w-[200px]">
                No roles or permissions assigned
              </div>
            );
          }

          return (
            <div className="space-y-2 min-w-[200px] max-w-[300px] ">
              {/* Render brand roles */}
              {roles.map((brandRole: any) => renderRole(brandRole))}

              {/* Render user permissions if any */}
              {renderUserPermissions(userPermissions, user.id)}
            </div>
          );
        },
      },
      {
        key: "reportsTo",
        label: "Reports To",
        render: (_: any, user: PartnerUser) => {
          if (user.reportsTo) {
            return (
              <div className="text-sm">
                <div className="font-medium text-[var(--color-on-background)]">
                  {user.reportsTo.name}
                </div>
                <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                  {user.reportsTo.email}
                </div>
              </div>
            );
          }
          return (
            <span className="text-xs text-[var(--color-on-surface)] opacity-70 italic">
              No supervisor
            </span>
          );
        },
      },
      {
        key: "user Status & Details",
        label: "Status & Details",
        render: (_: any, user: PartnerUser) => {
          return (
            <div className="max-w-[150px] space-y-2">
              {/* User Status */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Status:</span>
                {user.isActive ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    Inactive
                  </span>
                )}
              </div>

              {/* Last Login */}
              {user.lastLoginAt && (
                <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                  Last Login: {formatDateWithTime(user.lastLoginAt)}
                </div>
              )}

              {/* Role Count */}
              <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                Roles: {user.brandRoles?.length || 0}
              </div>

              {/* Total Permissions */}
              {user.brandRoles && user.brandRoles.length > 0 && (
                <div className="text-xs text-[var(--color-on-surface)] opacity-70">
                  Permissions:{" "}
                  {user.brandRoles.reduce((total: number, brandRole: any) => {
                    return total + (brandRole.role?.permissions?.length || 0);
                  }, 0)}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "created",
        label: "Created",
        render: (_: any, user: PartnerUser) => (
          <div className="text-sm text-[var(--color-on-background)]">
            {formatDateWithTime(user.createdAt)}
          </div>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        render: (_: any, user: PartnerUser) => {
          return (
            <div className="flex flex-col space-y-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleView(user.id);
                }}
                variant="primary"
                size="sm"
                className="w-full"
              >
                <FiEye className="h-4 w-4 mr-1" />
                View
              </Button>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateSecureCode(user);
                }}
                variant="outline"
                size="sm"
                className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300"
                title="Generate Secure Code (SUPER_ADMIN only)"
              >
                <FiKey className="h-4 w-4 mr-1" />
                Gen. Code
              </Button>

              {/* Audit Logs Button */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewAuditLogs(user);
                }}
                variant="outline"
                size="sm"
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300"
                title="View Audit Logs"
              >
                <FiFileText className="h-4 w-4 mr-1" />
                Audit Logs
              </Button>

              {/* Dialer Configuration Button */}
              {onOpenDialerConfig && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDialerConfig(user.id);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 hover:border-purple-300"
                  title="Configure Dialer"
                >
                  <BiPhoneCall className="h-4 w-4 mr-1" />
                  Dialer Config
                </Button>
              )}

              <div className="flex items-center space-x-1">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(user.id);
                  }}
                  variant="outline"
                  size="sm"
                  title="Edit User"
                  className="flex-1"
                >
                  <FiEdit2 className="h-4 w-4" />
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(user.id);
                  }}
                  disabled={deletingId === user.id}
                  variant="outline"
                  size="sm"
                  title="Delete User"
                  className={`flex-1 ${
                    deletingId === user.id
                      ? "cursor-not-allowed opacity-50"
                      : "hover:text-[var(--color-error)] hover:border-[var(--color-error)]"
                  }`}
                >
                  {deletingId === user.id ? (
                    <div className="border-2 border-t-[var(--color-error)] border-[var(--color-error)]/20 rounded-full w-4 h-4 animate-spin"></div>
                  ) : (
                    <FiTrash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        },
      },
    ],
    [
      handleView,
      handleEdit,
      handleDelete,
      handleGenerateSecureCode,
      handleViewAuditLogs,
      deletingId,
    ],
  );

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Error Message */}
      {error && (
        <div className="bg-white px-6 py-2 w-full flex-shrink-0">
          <ErrorMessage message={error} onRetry={() => setError(null)} />
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[var(--color-muted)] border-opacity-30 px-6 py-4 w-full flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between w-full gap-4">
          {/* Title */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-semibold text-[var(--color-on-background)]">
              Users
              <span className="text-[var(--color-on-surface)] opacity-70 font-normal">
                ({totalCount})
              </span>
              {(selectedRoleId || selectedPermissionId || searchTerm) && (
                <span className="text-sm text-[var(--color-primary)] ml-2">
                  • Filtered
                </span>
              )}
            </h1>
          </div>

          {/* Filters + Search */}
          <div className="flex items-center gap-2 flex-wrap justify-end flex-1 min-w-[300px]">
            {/* Role Filter */}
            <select
              value={selectedRoleId || ""}
              onChange={(e) => {
                const roleId = e.target.value
                  ? Number.parseInt(e.target.value, 10)
                  : null;
                setSelectedRoleId(roleId);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`
                 w-70 pl-11 pr-11 py-3
                 border-2 border-black/30 rounded-xl
                  text-sm font-medium
                  text-[var(--color-on-background)]
                  placeholder-[var(--color-on-surface)] placeholder-opacity-40
                  bg-[var(--color-surface)]
                  transition-all duration-200 ease-in-out
                  focus:outline-none
                 
              `}
            >
              <option value="">All Roles</option>
              {roles.map((role: any) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            {/* Permission Filter */}
            <select
              value={selectedPermissionId || ""}
              onChange={(e) => {
                const permissionId = e.target.value
                  ? Number.parseInt(e.target.value, 10)
                  : null;
                setSelectedPermissionId(permissionId);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`
                 w-70 pl-11 pr-11 py-3
                 border-2 border-black/30 rounded-xl
                  text-sm font-medium
                  text-[var(--color-on-background)]
                  placeholder-[var(--color-on-surface)] placeholder-opacity-40
                  bg-[var(--color-surface)]
                  transition-all duration-200 ease-in-out
                  focus:outline-none
                 
              `}
            >
              <option value="">All Permissions</option>
              {permissions.map((permission: any) => (
                <option key={permission.id} value={permission.id}>
                  {permission.name}
                </option>
              ))}
            </select>

            {/* Search */}
            <SearchInput
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value);
                setQuery("search", value);
              }}
              placeholder="Search by Name, ID, Email or Phone"
              onClear={clearSearch}
            />
          </div>
        </div>
      </div>

      {/* Create User Button */}
      <div className="flex gap-1 items-center justify-between bg-white border-b border-[var(--color-muted)] border-opacity-30 px-6 py-3 w-full">
        <div className="flex gap-1">
          <Button
            onClick={() => setQuery("createPartnerUser", "true")}
            type="button"
          >
            <FiPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        {/* Clear Filters Button */}
        {(selectedRoleId || selectedPermissionId || searchTerm) && (
          <Button
            onClick={() => {
              setSelectedRoleId(null);
              setSelectedPermissionId(null);
              setSearchTerm("");
              setQuery("search", "");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            variant="outline"
            size="sm"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Table Container - Scrollable */}
      <div className="flex-1 bg-white min-w-0">
        <div className="h-full overflow-y-auto overflow-x-auto">
          <Table
            columns={columns}
            data={users}
            loading={isLoading}
            emptyMessage={
              searchTerm || selectedRoleId || selectedPermissionId
                ? `No results found for the applied filters`
                : "No users found"
            }
            className="border-0 rounded-none"
          />
        </div>
      </div>

      {/* Fixed Pagination - Always at Bottom */}
      {totalCount > 0 && (
        <div className="bg-white border-t border-[var(--color-muted)] border-opacity-30 w-full flex-shrink-0">
          <TablePagination
            currentPage={pagination.page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pagination.limit}
            onPageChange={handlePageChange}
            onPageSizeChange={handleLimitChange}
            storageKey="usersList"
          />
        </div>
      )}

      {/* Generate Secure Code Modal */}
      <GenerateSecureCodeModal
        isOpen={secureCodeModal.isOpen}
        onClose={() =>
          setSecureCodeModal((prev) => ({ ...prev, isOpen: false }))
        }
        userId={secureCodeModal.userId}
        userName={secureCodeModal.userName}
        userEmail={secureCodeModal.userEmail}
        brandId={brandId || ""}
      />

      {/* Audit Logs Modal */}
      <AuditLogsModal
        isOpen={auditLogsModal.isOpen}
        onClose={() =>
          setAuditLogsModal((prev) => ({ ...prev, isOpen: false }))
        }
        userId={auditLogsModal.userId}
        userName={auditLogsModal.userName}
        userEmail={auditLogsModal.userEmail}
        brandId={brandId || ""}
      />
    </div>
  );
}

export default UserList;
