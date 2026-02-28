import { useEffect, useState } from "react";
import {
  fetchBrandPaths,
  createBrandPath,
  updateBrandPath,
  deleteBrandPath,
  reorderBrandPaths,
} from "../../../shared/services/api/settings/brandPaths.api";
import { useParams } from "react-router-dom";
import { Button } from "../../../common/ui/button";
import { Spinner } from "../../../common/ui/spinner";
import Dialog from "../../../common/dialog";
import { HiTrash, HiPencil } from "react-icons/hi2";
import { RxDragHandleDots2 } from "react-icons/rx";

interface BrandPath {
  id: string;
  path: string;
  label: string;
  icon?: string;
  isActive: boolean;
  isDisabled: boolean;
  sort_index: number;
  createdAt: string;
  updatedAt: string;
}

type DialogType = "add" | "edit" | null;

const PATH_OPTIONS = [
  "dashboard",
  "global-search",
  "user",
  "customers",
  "unallocated-customers",
  "loans",
  "reports",
  "credit-executive",
  "sanction-manager",
  "sanction-head",
  "loans-ops",
  "collection",
  "pre-collection",
  "post-collection",
  "completed",
];

export function BrandPathsSetting() {
  const { brandId } = useParams<{ brandId: string }>();

  const [paths, setPaths] = useState<BrandPath[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [iconInput, setIconInput] = useState("");
  const [isActiveInput, setIsActiveInput] = useState(true);
  const [isDisabledInput, setIsDisabledInput] = useState(false);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const load = async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const data = await fetchBrandPaths(brandId);
      // Sort by sort_index
      const sortedData = [...data].sort((a: BrandPath, b: BrandPath) => a.sort_index - b.sort_index);
      setPaths(sortedData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (brandId) load();
  }, [brandId]);

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPaths = [...paths];
    const draggedItem = newPaths[draggedIndex];
    newPaths.splice(draggedIndex, 1);
    newPaths.splice(index, 0, draggedItem);
    setPaths(newPaths);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null || !brandId) {
      setDraggedIndex(null);
      return;
    }

    setDraggedIndex(null);
    setActionLoading(true);

    try {
      const reorderedPaths = paths.map((path, index) => ({
        id: path.id,
        sortIndex: index + 1,
      }));
      await reorderBrandPaths(brandId, reorderedPaths);
    } catch {
      // Reload on error to restore original order
      load();
    } finally {
      setActionLoading(false);
    }
  };

  // Open Add Dialog
  const openAddDialog = () => {
    setDialogType("add");
    setPathInput("");
    setLabelInput("");
    setIconInput("");
    setIsActiveInput(true);
    setIsDisabledInput(false);
    setCurrentId(null);
    setDialogOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (path: BrandPath) => {
    setDialogType("edit");
    setPathInput(path.path);
    setLabelInput(path.label);
    setIconInput(path.icon || "");
    setIsActiveInput(path.isActive);
    setIsDisabledInput(path.isDisabled);
    setCurrentId(path.id);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setPathInput("");
    setLabelInput("");
    setIconInput("");
    setIsActiveInput(true);
    setIsDisabledInput(false);
    setCurrentId(null);
    setDialogType(null);
  };

  const handleDialogConfirm = async () => {
    if (!pathInput.trim() || !labelInput.trim() || !brandId) return;

    setActionLoading(true);
    try {
      if (dialogType === "add") {
        await createBrandPath(
          brandId,
          pathInput.trim(),
          labelInput.trim(),
          iconInput.trim(),
          isActiveInput,
          isDisabledInput
        );
      } else if (dialogType === "edit" && currentId) {
        await updateBrandPath(brandId, currentId, {
          path: pathInput.trim(),
          label: labelInput.trim(),
          icon: iconInput.trim(),
          isActive: isActiveInput,
          isDisabled: isDisabledInput,
        });
      }
      handleDialogClose();
      load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!brandId) return;
    if (!globalThis.confirm("Are you sure you want to delete this path?"))
      return;

    setActionLoading(true);
    try {
      await deleteBrandPath(brandId, id);
      load();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-[var(--border)]">
      <h2 className="text-2xl font-bold mb-2">Brand Paths Management</h2>
      <p className="mb-6 text-gray-600">
        Manage custom navigation paths for your brand
      </p>

      <div className="mb-6">
        <Button variant="primary" onClick={openAddDialog}>
          Add New Path
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)] w-10">
                  
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">
                  Path
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">
                  Label
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">
                  Icon
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">
                  Disabled
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paths.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-8 text-[var(--muted-foreground)]"
                  >
                    No paths created yet
                  </td>
                </tr>
              ) : (
                paths.map((path, index) => (
                  <tr
                    key={path.id}
                    className={`border-b border-[var(--border)] hover:bg-[var(--color-background)] ${
                      draggedIndex === index ? "opacity-50 bg-blue-50" : ""
                    }`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <td className="py-3 px-2 text-sm text-[var(--foreground)]">
                      <div className="cursor-grab active:cursor-grabbing">
                        <RxDragHandleDots2 className="w-5 h-5 text-gray-400" />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                      {path.path}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                      {path.label}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                      {path.icon || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          path.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {path.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          path.isDisabled
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {path.isDisabled ? "Disabled" : "Enabled"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditDialog(path)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                          disabled={actionLoading}
                        >
                          <HiPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(path.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                          disabled={actionLoading}
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        title={dialogType === "add" ? "Add New Path" : "Edit Path"}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="pathSelect" className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Path *
            </label>
            <select
              id="pathSelect"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="">Select a path...</option>
              {PATH_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="labelInput" className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Label *
            </label>
            <input
              id="labelInput"
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="Custom Path Label"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label htmlFor="iconInput" className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Icon (optional)
            </label>
            <input
              id="iconInput"
              type="text"
              value={iconInput}
              onChange={(e) => setIconInput(e.target.value)}
              placeholder="HiCog6Tooth"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActiveInput}
              onChange={(e) => setIsActiveInput(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-sm text-[var(--foreground)]">
              Active
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDisabled"
              checked={isDisabledInput}
              onChange={(e) => setIsDisabledInput(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isDisabled" className="text-sm text-[var(--foreground)]">
              Disabled
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDialogConfirm}
              disabled={actionLoading || !pathInput.trim() || !labelInput.trim()}
            >
              {actionLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
