import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Dialog from "../../../common/dialog";
import { BrandProviderType, BrandProviderName } from "../../../constant/enum";
import {
  getBrandProviders,
  createBrandProvider,
  updateBrandProvider,
  deleteBrandProvider,
} from "../../../shared/services/api/settings/brandProvider.setting.api";
import { Button } from "../../../common/ui/button";
import { Spinner } from "../../../common/ui/spinner";

interface BrandProvider {
  id: string;
  type: BrandProviderType;
  provider: BrandProviderName;
  isActive: boolean;
  isDisabled: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export function BrandProviderSetting() {
  const { brandId } = useParams();
  const [providers, setProviders] = useState<BrandProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<BrandProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const initialFormData = {
    id: "",
    type: BrandProviderType.PENNYDROP,
    provider: BrandProviderName.DIGITAP,
    isActive: true,
    isDisabled: false,
    isPrimary: false,
  };

  const [formData, setFormData] = useState<{
    id: string;
    type: BrandProviderType;
    provider: BrandProviderName;
    isActive: boolean;
    isDisabled: boolean;
    isPrimary: boolean;
  }>(initialFormData);

  useEffect(() => {
    fetchProviders();
  }, [brandId]);

  useEffect(() => {
    applyTypeFilter();
  }, [providers, selectedTypeFilter, searchTerm]);

  const fetchProviders = async () => {
    if (!brandId) {
      setError("Brand ID is missing");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await getBrandProviders(brandId);
      setProviders(response || []);
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Failed to fetch providers.");
    } finally {
      setLoading(false);
    }
  };

  const applyTypeFilter = () => {
    let filtered = providers;
    if (selectedTypeFilter !== "ALL") {
      filtered = filtered.filter(provider => provider.type === selectedTypeFilter);
    }
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(provider => 
        provider.provider.toLowerCase().includes(searchLower) ||
        getProviderTypeLabel(provider.type).toLowerCase().includes(searchLower)
      );
    }

    setFilteredProviders(filtered);
  };

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTypeFilter(e.target.value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearFilters = () => {
    setSelectedTypeFilter("ALL");
    setSearchTerm("");
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" && (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openCreateDialog = () => {
    setIsEditing(false);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleEditProvider = (provider: BrandProvider) => {
    setIsEditing(true);
    setFormData({
      id: provider.id,
      type: provider.type,
      provider: provider.provider,
      isActive: provider.isActive,
      isDisabled: provider.isDisabled,
      isPrimary: provider.isPrimary,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId) return;

    setFormLoading(true);
    try {
      if (isEditing) {
        await updateBrandProvider(brandId, formData.id, {
          type: formData.type,
          provider: formData.provider,
          isActive: formData.isActive,
          isDisabled: formData.isDisabled,
          isPrimary: formData.isPrimary,
        });
      } else {
        await createBrandProvider(brandId, {
          type: formData.type,
          provider: formData.provider,
          isActive: formData.isActive,
          isDisabled: formData.isDisabled,
          isPrimary: formData.isPrimary,
        });
      }
      setDialogOpen(false);
      fetchProviders();
    } catch (err) {
      setError((err as Error).message || "Failed to save provider.");
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (providerId: string) => {
    setProviderToDelete(providerId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!brandId || !providerToDelete) return;

    setFormLoading(true);
    try {
      await deleteBrandProvider(brandId, providerToDelete);
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
      fetchProviders();
    } catch (err) {
      setError((err as Error).message || "Failed to delete provider.");
    } finally {
      setFormLoading(false);
    }
  };

  const getProviderTypeLabel = (type: BrandProviderType) => {
    return type.replace(/_/g, " ");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-5xl w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-[var(--border)]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-on-surface)]">
            Brand Providers
          </h2>
          <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-2">
            Configure third-party service providers for different operations
          </p>
        </div>
        <Button variant="primary" onClick={openCreateDialog}>
          Add Provider
        </Button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div>
            <label htmlFor="typeFilter" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
              Filter by Type
            </label>
            <select
              id="typeFilter"
              value={selectedTypeFilter}
              onChange={handleTypeFilterChange}
              className="px-3 py-2 border border-[var(--color-outline)] rounded-md focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-white"
            >
              <option value="ALL">All Types</option>
              {Object.values(BrandProviderType).map((type) => (
                <option key={type} value={type}>
                  {getProviderTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="searchInput" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
              Search
            </label>
            <input
              id="searchInput"
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search providers..."
              className="px-3 py-2 border border-[var(--color-outline)] rounded-md focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-white min-w-[250px]"
            />
          </div>
          {(selectedTypeFilter !== "ALL" || searchTerm.trim()) && (
            <div className="self-end">
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] border border-[var(--color-primary)] hover:border-[var(--color-primary-dark)] rounded-md transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
        <div className="text-sm text-[var(--color-on-surface)] opacity-70">
          {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border border-[var(--color-outline)] rounded-lg overflow-hidden">
          <thead className="bg-[var(--color-surface)] border-b border-[var(--color-outline)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface)] uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface)] uppercase tracking-wider">
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface)] uppercase tracking-wider">
                Primary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[var(--color-outline)]">
            {filteredProviders.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-[var(--color-on-surface)] opacity-70"
                >
                  {providers.length === 0 ? 
                    "No providers configured. Click \"Add Provider\" to get started." :
                    "No providers match the selected filter."
                  }
                </td>
              </tr>
            ) : (
              filteredProviders.map((provider) => (
                <tr key={provider.id} className="hover:bg-[var(--color-surface)]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-on-surface)]">
                    <span className="font-medium">
                      {getProviderTypeLabel(provider.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-on-surface)]">
                    {provider.provider}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          provider.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {provider.isActive ? "Active" : "Inactive"}
                      </span>
                      {provider.isDisabled && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Disabled
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {provider.isPrimary && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Primary
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEditProvider(provider)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => confirmDelete(provider.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <Dialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title={isEditing ? "Edit Provider" : "Add New Provider"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-2"
              >
                Provider Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-[var(--color-outline)] rounded-md focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                required
              >
                {Object.values(BrandProviderType).map((type) => (
                  <option key={type} value={type}>
                    {getProviderTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="provider"
                className="block text-sm font-medium text-[var(--color-on-surface)] mb-2"
              >
                Provider Name <span className="text-red-500">*</span>
              </label>
              <select
                id="provider"
                name="provider"
                value={formData.provider}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-[var(--color-outline)] rounded-md focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                required
              >
                {Object.values(BrandProviderName).map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300 rounded"
                />
                <label
                  htmlFor="isActive"
                  className="ml-2 block text-sm text-[var(--color-on-surface)]"
                >
                  Active
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDisabled"
                  name="isDisabled"
                  checked={formData.isDisabled}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300 rounded"
                />
                <label
                  htmlFor="isDisabled"
                  className="ml-2 block text-sm text-[var(--color-on-surface)]"
                >
                  Disabled
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrimary"
                  name="isPrimary"
                  checked={formData.isPrimary}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300 rounded"
                />
                <label
                  htmlFor="isPrimary"
                  className="ml-2 block text-sm text-[var(--color-on-surface)]"
                >
                  Primary
                </label>
              </div>
            </div>

            <p className="text-xs text-[var(--color-on-surface)] opacity-70">
              Note: Setting as Primary will automatically unset any existing primary provider for this type.
            </p>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={formLoading}
              >
                {isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <Dialog
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title="Delete Provider"
        >
          <div className="space-y-4">
            <p className="text-[var(--color-on-surface)]">
              Are you sure you want to delete this provider? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                loading={formLoading}
              >
                Delete
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
