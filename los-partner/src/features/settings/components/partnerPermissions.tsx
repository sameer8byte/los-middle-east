import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiChevronDown,
  FiCheck,
  FiX,
} from "react-icons/fi";
import { Spinner } from "../../../common/ui/spinner";
import { Button } from "../../../common/ui/button";

interface Permission {
  id: number;
  name: string;
  description: string;
  permission_group_id?: number;
  permissionGroupId?: number;
}

export function PartnerPermissions() {
  const { brandId } = useParams();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number | undefined>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Permission>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPermission, setNewPermission] = useState({
    name: "",
    description: "",
    permission_group_id: undefined as number | undefined,
  });

  // Group permissions by permission_group_id
  const groupedPermissions = useMemo(() => {
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
        return (a[0] ?? 0) - (b[0] ?? 0);
      })
      .map(([groupId, perms]) => ({
        groupId,
        permissions: perms,
      }));
  }, [permissions]);

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

  const handleEdit = (permission: Permission) => {
    setEditingId(permission.id);
    setEditData({
      name: permission.name,
      description: permission.description,
      permission_group_id: permission.permission_group_id,
    });
  };

  const handleSaveEdit = async (permissionId: number) => {
    try {
      setError(null);
      // TODO: Replace with actual API call
      // await updatePermission(brandId, permissionId, editData);
      
      setPermissions((prev) =>
        prev.map((p) =>
          p.id === permissionId
            ? { ...p, ...editData }
            : p
        )
      );
      setEditingId(null);
      setEditData({});
    } catch (err) {
      setError((err as Error).message || "Failed to update permission");
    }
  };

  const handleDelete = async (permissionId: number) => {
    try {
      setError(null);
      // TODO: Replace with actual API call
      // await deletePermission(brandId, permissionId);
      
      setPermissions((prev) => prev.filter((p) => p.id !== permissionId));
    } catch (err) {
      setError((err as Error).message || "Failed to delete permission");
    }
  };

  const handleAddPermission = async () => {
    try {
      if (!newPermission.name.trim()) {
        setError("Permission name is required");
        return;
      }

      setError(null);
      // TODO: Replace with actual API call
      // const result = await createPermission(brandId, newPermission);
      
      const mockId = Math.max(...permissions.map(p => p.id), 0) + 1;
      setPermissions((prev) => [
        ...prev,
        {
          id: mockId,
          name: newPermission.name,
          description: newPermission.description,
          permission_group_id: newPermission.permission_group_id,
        },
      ]);

      setNewPermission({
        name: "",
        description: "",
        permission_group_id: undefined,
      });
      setShowAddForm(false);
    } catch (err) {
      setError((err as Error).message || "Failed to add permission");
    }
  };

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // TODO: Replace with actual API call
        // const data = await getBrandPermissions(brandId);
        // setPermissions(data);

        // Mock data for now
        setPermissions([
          {
            id: 1,
            name: "View Reports",
            description: "Allows partners to view all reports",
            permission_group_id: 1,
          },
          {
            id: 2,
            name: "Export Reports",
            description: "Allows partners to export reports in various formats",
            permission_group_id: 1,
          },
          {
            id: 3,
            name: "Create Loan",
            description: "Allows partners to create new loan applications",
            permission_group_id: 2,
          },
          {
            id: 4,
            name: "Approve Loan",
            description: "Allows partners to approve loan applications",
            permission_group_id: 2,
          },
          {
            id: 5,
            name: "View Users",
            description: "Allows partners to view all users",
            permission_group_id: undefined,
          },
        ]);
      } catch (err) {
        setError((err as Error).message || "Failed to load permissions");
      } finally {
        setIsLoading(false);
      }
    };

    if (brandId) {
      fetchPermissions();
    }
  }, [brandId]);

  if (!brandId) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
          <p className="text-red-700">Brand ID is required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Partner Permissions
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Manage partner permissions with groups and descriptions. Update permissions to control partner access.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-[var(--destructive)]/5 border border-[var(--destructive)]/30 rounded-lg flex items-start space-x-3">
          <div className="w-5 h-5 bg-[var(--destructive)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <p className="text-[var(--destructive)] text-xs font-medium">
            {error}
          </p>
        </div>
      )}

      <div className="mb-6">
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--primary)]/90 transition-all"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add Permission</span>
        </Button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="permName" className="text-xs font-medium text-[var(--foreground)]">
                Permission Name <span className="text-[var(--destructive)]">*</span>
              </label>
              <input
                id="permName"
                type="text"
                value={newPermission.name}
                onChange={(e) =>
                  setNewPermission((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm"
                placeholder="e.g., Create Report"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="permGroup" className="text-xs font-medium text-[var(--foreground)]">
                Permission Group ID
              </label>
              <input
                id="permGroup"
                type="number"
                value={newPermission.permission_group_id || ""}
                onChange={(e) =>
                  setNewPermission((prev) => ({
                    ...prev,
                    permission_group_id: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm"
                placeholder="e.g., 1"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="permDesc" className="text-xs font-medium text-[var(--foreground)]">
              Description
            </label>
            <textarea
              id="permDesc"
              value={newPermission.description}
              onChange={(e) =>
                setNewPermission((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm"
              placeholder="Describe what this permission allows"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAddPermission}
              className="flex items-center space-x-1 bg-[var(--primary)] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[var(--primary)]/90 transition-all"
            >
              <FiCheck className="w-3.5 h-3.5" />
              <span>Save</span>
            </Button>
            <Button
              onClick={() => setShowAddForm(false)}
              className="flex items-center space-x-1 bg-[var(--border)] text-[var(--foreground)] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[var(--border)]/70 transition-all"
            >
              <FiX className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : permissions.length === 0 ? (
        <div className="p-8 text-center bg-[var(--secondary-bg)] rounded-lg border border-[var(--border)]">
          <p className="text-[var(--muted-foreground)]">No permissions found</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {groupedPermissions.map((group) => (
            <div key={group.groupId || "ungrouped"} className="space-y-1.5">
              {/* Group Header */}
              <button
                type="button"
                onClick={() => toggleGroupExpand(group.groupId)}
                className="w-full flex items-center space-x-2 px-3 py-2 bg-[var(--secondary-bg)] rounded-lg border border-[var(--border)] hover:border-[var(--primary)]/40 transition-colors group"
              >
                <div className="w-2 h-2 bg-[var(--primary)] rounded-full group-hover:scale-125 transition-transform"></div>
                <span className="text-sm font-semibold text-[var(--foreground)] flex-1 text-left">
                  {group.groupId ? `Group ${group.groupId}` : "Ungrouped"}
                </span>
                <span className="text-xs text-[var(--muted-foreground)] bg-white px-2 py-0.5 rounded">
                  {group.permissions.length}
                </span>
                <FiChevronDown
                  className={`w-4 h-4 text-[var(--foreground)] transform transition-transform duration-200 ${
                    expandedGroups.has(group.groupId) ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Permissions List - Collapsible */}
              {expandedGroups.has(group.groupId) && (
                <div className="pl-2 space-y-1.5 border-l-2 border-[var(--primary)]/20">
                  {group.permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="p-3 bg-white rounded-lg border border-[var(--border)] hover:border-[var(--primary)]/40 transition-colors"
                    >
                      {editingId === permission.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editData.name || ""}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm font-medium"
                          />
                          <textarea
                            value={editData.description || ""}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm"
                            rows={2}
                          />
                          <input
                            type="number"
                            value={editData.permission_group_id || ""}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                permission_group_id: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              }))
                            }
                            className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all text-sm"
                            placeholder="Group ID"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleSaveEdit(permission.id)}
                              className="flex items-center space-x-1 bg-[var(--primary)] text-white px-2 py-1 rounded text-xs font-medium hover:bg-[var(--primary)]/90 transition-all"
                            >
                              <FiCheck className="w-3 h-3" />
                              <span>Save</span>
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingId(null);
                                setEditData({});
                              }}
                              className="flex items-center space-x-1 bg-[var(--border)] text-[var(--foreground)] px-2 py-1 rounded text-xs font-medium hover:bg-[var(--border)]/70 transition-all"
                            >
                              <FiX className="w-3 h-3" />
                              <span>Cancel</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-[var(--foreground)]">
                              {permission.name}
                            </h4>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              {permission.description}
                            </p>
                            {permission.permission_group_id && (
                              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                                <span className="font-medium">Group ID:</span> {permission.permission_group_id}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <button
                              onClick={() => handleEdit(permission)}
                              className="p-1.5 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded transition-colors"
                              title="Edit"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(permission.id)}
                              className="p-1.5 text-[var(--destructive)] hover:bg-[var(--destructive)]/10 rounded transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
