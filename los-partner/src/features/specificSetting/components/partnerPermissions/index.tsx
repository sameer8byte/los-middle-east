import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "../../../../common/ui/spinner";
import {
  FiChevronDown,
  FiAlertCircle,
  FiX,
  FiEdit2,
  FiTrash2,
  FiCheck,
} from "react-icons/fi";
import {
  getPermissions,
  getRoles,
  updatePermissionDescription,
  deletePermission,
  Permission,
  Role,
} from "../../../../shared/services/api/partner-permissions.api";

export function PartnerPermissions() {
  const { brandId } = useParams();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number | undefined>>(
    new Set()
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editGroupId, setEditGroupId] = useState<number | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Clear error after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fetch all permissions and roles
  useEffect(() => {
    const fetchData = async () => {
      if (!brandId) return;
      setIsLoading(true);
      try {
        const [permissionsData, rolesData] = await Promise.all([
          getPermissions(brandId),
          getRoles(brandId),
        ]);
        setPermissions(permissionsData);
        setRoles(rolesData);
        setError(null);
      } catch (err) {
        setError((err as Error).message || "Failed to load data");
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [brandId]);

  const toggleGroupExpand = useCallback((groupId: number | undefined) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  const groupedPermissions = React.useMemo(() => {
    const groups: Map<number | undefined, Permission[]> = new Map();
    permissions.forEach((permission) => {
      const groupId = permission.permission_group_id ?? permission.permissionGroupId;
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(permission);
    });

    return Array.from(groups.entries())
      .sort((a, b) => {
        if (a[0] === undefined) return -1;
        if (b[0] === undefined) return 1;
        return a[0] - b[0];
      })
      .map(([groupId, perms]) => {
        const sortedPerms = [...perms].sort((a: Permission, b: Permission) =>
          a.name.localeCompare(b.name)
        );
        return {
          groupId,
          permissions: sortedPerms,
        };
      });
  }, [permissions]);

  const getGroupName = useCallback(
    (groupId: number | undefined) => {
      if (groupId === undefined) return "Ungrouped";
      const role = roles.find((r) => r.id === groupId);
      return role?.name || `Group ${groupId}`;
    },
    [roles]
  );

  const startEdit = useCallback((permission: Permission) => {
    setEditingId(permission.id);
    setEditDescription(permission.description || "");
    setEditGroupId(permission.permission_group_id ?? permission.permissionGroupId);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDescription("");
    setEditGroupId(undefined);
  }, []);

  const saveEdit = useCallback(
    async (permissionId: number) => {
      if (!brandId) return;
      setIsSaving(true);
      try {
        // Get the role name if a role ID was selected
        let groupName = undefined;
        if (editGroupId !== undefined) {
          const selectedRole = roles.find((r) => r.id === editGroupId);
          groupName = selectedRole?.name;
        }

        await updatePermissionDescription(
          brandId,
          permissionId,
          editDescription,
          groupName
        );
        // Update local state
        setPermissions((prev) =>
          prev.map((p) =>
            p.id === permissionId
              ? {
                  ...p,
                  description: editDescription,
                  permission_group_id: editGroupId,
                }
              : p
          )
        );
        setEditingId(null);
        setEditDescription("");
        setEditGroupId(undefined);
        setError(null);
      } catch (err) {
        setError((err as Error).message || "Failed to save permission");
      } finally {
        setIsSaving(false);
      }
    },
    [brandId, editDescription, editGroupId, roles]
  );

  const handleDelete = useCallback(
    async (permissionId: number) => {
      if (!brandId) return;
      setIsSaving(true);
      try {
        await deletePermission(brandId, permissionId);
        // Update local state
        setPermissions((prev) => prev.filter((p) => p.id !== permissionId));
        setDeleteConfirmId(null);
        setError(null);
      } catch (err) {
        setError((err as Error).message || "Failed to delete permission");
      } finally {
        setIsSaving(false);
      }
    },
    [brandId]
  );

  const renderPermissionContent = (permission: Permission) => {
    const isEditing = editingId === permission.id;
    const isDeleting = deleteConfirmId === permission.id;

    if (isEditing) {
      return (
        <div className="space-y-3">
          <div>
            <label htmlFor={`desc-${permission.id}`} className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
              Description
            </label>
            <textarea
              id={`desc-${permission.id}`}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-white text-[var(--foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              rows={3}
            />
          </div>

          <div>
            <label htmlFor={`group-${permission.id}`} className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
              Role / Group
            </label>
            <select
              id={`group-${permission.id}`}
              value={editGroupId ?? ""}
              onChange={(e) => setEditGroupId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-white text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">Ungrouped</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => saveEdit(permission.id)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiCheck className="w-4 h-4" />
              Save
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--secondary-bg)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiX className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (isDeleting) {
      return (
        <div className="p-4 bg-[var(--destructive)]/5 border border-[var(--destructive)]/20 rounded">
          <p className="text-sm text-[var(--foreground)] mb-3">
            Are you sure you want to delete this permission? This action cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDelete(permission.id)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--destructive)] text-white text-sm font-medium hover:bg-[var(--destructive)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--secondary-bg)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    // View mode
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)] break-words">
            {permission.name}
          </p>
          {permission.description ? (
            <p className="text-sm text-[var(--muted-foreground)] mt-1.5 break-words">
              {permission.description}
            </p>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]/60 italic mt-1.5">
              No description available
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => startEdit(permission)}
            className="p-1.5 rounded hover:bg-[var(--secondary-bg)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            title="Edit permission"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirmId(permission.id)}
            className="p-1.5 rounded hover:bg-[var(--destructive)]/10 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
            title="Delete permission"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <Spinner />
          <p className="text-sm text-[var(--muted-foreground)]">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--border)]">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Partner Permissions
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          View permissions assigned to partner users and their role/group assignments
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-[var(--destructive)]/5 border border-[var(--destructive)]/20 rounded-lg flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
          <FiAlertCircle className="w-5 h-5 text-[var(--destructive)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--destructive)] font-medium flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-[var(--destructive)]/60 hover:text-[var(--destructive)] transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Permissions List */}
      <div className="bg-white rounded-lg border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">
            Permissions <span className="text-[var(--muted-foreground)] font-normal">({permissions.length})</span>
          </h2>
        </div>

        {permissions.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="space-y-2">
              <p className="text-[var(--muted-foreground)]">
                No permissions found
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Permissions will appear here once they are created in your system
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {groupedPermissions.map((group) => (
              <div key={group.groupId || "ungrouped"} className="divide-y divide-[var(--border)]/50">
                {/* Group Header */}
                <button
                  type="button"
                  onClick={() => toggleGroupExpand(group.groupId)}
                  className="w-full flex items-center space-x-3 px-6 py-3.5 hover:bg-[var(--secondary-bg)]/40 transition-colors text-left"
                >
                  <FiChevronDown
                    className={`w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0 transform transition-transform duration-200 ${
                      expandedGroups.has(group.groupId) ? "rotate-180" : ""
                    }`}
                  />
                  <span className="text-sm font-semibold text-[var(--foreground)] flex-1">
                    {getGroupName(group.groupId)}
                  </span>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
                    {group.permissions.length}
                  </span>
                </button>

                {/* Permissions List - Collapsible */}
                {expandedGroups.has(group.groupId) && (
                  <div className="bg-[var(--secondary-bg)]/30">
                    {group.permissions.map((permission: Permission, idx: number) => (
                      <div
                        key={permission.id}
                        className={`px-6 py-4 transition-colors ${
                          idx === group.permissions.length - 1 ? "" : "border-b border-[var(--border)]/50"
                        } hover:bg-[var(--secondary-bg)]/50`}
                      >
                        {renderPermissionContent(permission)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
