import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  HiEye,
  HiPencil,
  HiTrash,
  HiMagnifyingGlass,
  HiAdjustmentsHorizontal,
  HiArrowDownTray,
} from "react-icons/hi2";
import { Spinner } from "../../../../../common/ui/spinner";
import { Button } from "../../../../../common/ui/button";
import {
  BrandEvaluationItem,
  EvaluationStage,
  BrandEvaluationItemsQuery,
  getBrandEvaluationItems,
  deleteBrandEvaluationItem,
} from "../../../../../shared/services/api/settings/brandEvaluationItems.setting.api";
import Dialog from "../../../../../common/dialog";

interface BrandEvaluationItemsListProps {
  refreshTrigger: number;
  onItemChange: () => void;
  onEditItem?: (item: BrandEvaluationItem) => void;
}

export function BrandEvaluationItemsList({
  refreshTrigger,
  onItemChange,
  onEditItem,
}: BrandEvaluationItemsListProps) {
  const { brandId } = useParams<{ brandId: string }>();
  const [items, setItems] = useState<BrandEvaluationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewingItem, setViewingItem] = useState<BrandEvaluationItem | null>(
    null
  );
  const [filters, setFilters] = useState<BrandEvaluationItemsQuery>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (brandId) {
      fetchItems();
    }
  }, [brandId, refreshTrigger, filters]);

  const fetchItems = async () => {
    if (!brandId) return;

    setLoading(true);
    try {
      const query = { ...filters };
      if (searchTerm) {
        query.parameter = searchTerm;
      }

      const response = await getBrandEvaluationItems(brandId, query);
      setItems(response);
    } catch (error: any) {
      console.error("Error fetching evaluation items:", error);
      toast.error(
        error?.response?.data?.message || "Failed to load evaluation items"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: BrandEvaluationItem) => {
    if (
      !brandId ||
      !window.confirm(`Are you sure you want to delete "${item.parameter}"?`)
    ) {
      return;
    }

    try {
      await deleteBrandEvaluationItem(brandId, item.id);
      toast.success("Evaluation item deleted successfully");
      onItemChange();
    } catch (error: any) {
      console.error("Error deleting evaluation item:", error);
      toast.error(
        error?.response?.data?.message || "Failed to delete evaluation item"
      );
    }
  };

  const handleSearch = () => {
    fetchItems();
  };

  const handleFilterChange = (
    key: keyof BrandEvaluationItemsQuery,
    value: any
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
  };

  const getStageColor = (stage: EvaluationStage) => {
    switch (stage) {
      case EvaluationStage.ONE:
        return "bg-blue-100 text-blue-800";
      case EvaluationStage.TWO:
        return "bg-yellow-100 text-yellow-800";
      case EvaluationStage.THREE:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleEdit = (item: BrandEvaluationItem) => {
    if (onEditItem) {
      onEditItem(item);
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Define CSV headers
    const headers = [
      "Parameter",
      "Required Value",
      "Description",
      "Stage",
      "Priority",
      "Status",
      "Sources",
      "Created At",
      "Updated At",
    ];

    // Convert items to CSV rows
    const csvRows = [
      headers.join(","), // Header row
      ...items.map((item) => [
        `"${item.parameter.replace(/"/g, '""')}"`,
        `"${item.requiredValue.replace(/"/g, '""')}"`,
        `"${(item.description || "").replace(/"/g, '""')}"`,
        `"Stage ${item.stage}"`,
        item.priority,
        item.isActive ? "Active" : "Inactive",
        `"${item.sources.join(", ").replace(/"/g, '""')}"`,
        `"${new Date(item.createdAt).toLocaleString()}"`,
        `"${new Date(item.updatedAt).toLocaleString()}"`,
      ].join(","))
    ];

    // Create and download CSV file
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `evaluation-items-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("CSV file downloaded successfully");
    } else {
      toast.error("CSV download not supported in this browser");
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-[var(--border)] p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <HiMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted-foreground)] w-4 h-4" />
              <input
                type="text"
                placeholder="Search by parameter name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-md focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} variant="outline">
              Search
            </Button>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
            >
              <HiAdjustmentsHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              disabled={items.length === 0}
              title="Download CSV"
            >
              <HiArrowDownTray className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-[var(--muted)] bg-opacity-50 rounded-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Stage
                </label>
                <select
                  value={filters.stage || ""}
                  onChange={(e) =>
                    handleFilterChange("stage", e.target.value || undefined)
                  }
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                >
                  <option value="">All Stages</option>
                  <option value={EvaluationStage.ONE}>Stage One</option>
                  <option value={EvaluationStage.TWO}>Stage Two</option>
                  <option value={EvaluationStage.THREE}>Stage Three</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Status
                </label>
                <select
                  value={
                    filters.isActive !== undefined
                      ? filters.isActive.toString()
                      : ""
                  }
                  onChange={(e) =>
                    handleFilterChange(
                      "isActive",
                      e.target.value === ""
                        ? undefined
                        : e.target.value === "true"
                    )
                  }
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg shadow-sm border border-[var(--border)]">
        {loading ? (
          <div className="p-8 text-center">
            <Spinner />
            <p className="mt-2 text-[var(--muted-foreground)]">
              Loading evaluation items...
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--muted)] rounded-full flex items-center justify-center">
              <HiAdjustmentsHorizontal className="w-8 h-8 text-[var(--muted-foreground)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
              No evaluation items found
            </h3>
            <p className="text-[var(--muted-foreground)]">
              {searchTerm || Object.keys(filters).length > 0
                ? "Try adjusting your search or filters"
                : "Get started by creating your first evaluation item"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border)] text-sm">
              <thead className="bg-[var(--muted)] bg-opacity-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase tracking-wider whitespace-nowrap">
                    Parameter
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase tracking-wider whitespace-nowrap">
                    Required Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase tracking-wider whitespace-nowrap">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase tracking-wider whitespace-nowrap">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4- py-3 text-center text-xs font-medium text-[var(--foreground)] uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-white">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--muted)] hover:bg-opacity-25 transition-colors duration-150"
                  >
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex flex-col">
                        <div className="font-medium text-[var(--foreground)] truncate">
                          {item.parameter}
                        </div>
                        {item.description && (
                          <div className="text-[var(--muted-foreground)] truncate text-xs mt-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--foreground)]">
                      {item.requiredValue}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStageColor(
                          item.stage
                        )}`}
                      >
                        Stage {item.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--foreground)]">
                      {item.priority}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          item.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setViewingItem(item)}
                          className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--muted)] rounded transition-colors duration-150"
                          title="View details"
                        >
                          <HiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--muted)] rounded transition-colors duration-150"
                          title="Edit"
                        >
                          <HiPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-[var(--muted-foreground)] hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-150"
                          title="Delete"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Item Modal */}
      {viewingItem && (
        <Dialog
          isOpen={true}
          onClose={() => setViewingItem(null)}
          title="Evaluation Item Details"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Parameter
              </label>
              <p className="text-[var(--muted-foreground)]">
                {viewingItem.parameter}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Required Value
              </label>
              <p className="text-[var(--muted-foreground)]">
                {viewingItem.requiredValue}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Sources
              </label>
              <div className="flex flex-wrap gap-2">
                {viewingItem.sources.map((source, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-[var(--muted)] text-[var(--foreground)] text-sm rounded"
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Stage
                </label>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(
                    viewingItem.stage
                  )}`}
                >
                  Stage {viewingItem.stage}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Priority
                </label>
                <p className="text-[var(--muted-foreground)]">
                  {viewingItem.priority}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Status
              </label>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  viewingItem.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {viewingItem.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {viewingItem.description && (
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Description
                </label>
                <p className="text-[var(--muted-foreground)]">
                  {viewingItem.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm text-[var(--muted-foreground)]">
              <div>
                <label className="block font-medium mb-1">Created At</label>
                <p>{new Date(viewingItem.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="block font-medium mb-1">Updated At</label>
                <p>{new Date(viewingItem.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setViewingItem(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                handleEdit(viewingItem);
                setViewingItem(null);
              }}
            >
              Edit
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}