import { useEffect, useState } from "react";
import {
  fetchBrandSubDomains,
  createBrandSubDomain,
  updateBrandSubDomain,
  deleteBrandSubDomain,
  toggleBrandSubDomainDisabled,
} from "../../../shared/services/api/settings/brandSubDomains.api";
import { useParams } from "react-router-dom";
import { Button } from "../../../common/ui/button";
import { Spinner } from "../../../common/ui/spinner";
import Dialog from "../../../common/dialog";

interface SubDomain {
  id: string;
  subdomain: string;
  isPrimary: boolean;
  isActive: boolean;
  isDisabled: boolean;
  marketingSource?: string;
  createdAt: string;
  updatedAt: string;
}

type DialogType = 'add' | 'edit' | null;

export function BrandSubDomainsSetting() {
  const { brandId } = useParams<{ brandId: string }>();

  const [subDomains, setSubDomains] = useState<SubDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [subDomainInput, setSubDomainInput] = useState("");
  const [marketingSourceInput, setMarketingSourceInput] = useState("");
  const [isPrimaryInput, setIsPrimaryInput] = useState(false);

  const load = async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const data = await fetchBrandSubDomains(brandId);
      setSubDomains(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (brandId) load();
  }, [brandId]);

  // Open Add Dialog
  const openAddDialog = () => {
    setDialogType("add");
    setSubDomainInput("");
    setMarketingSourceInput("");
    setIsPrimaryInput(false);
    setCurrentId(null);
    setDialogOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (sd: SubDomain) => {
    setDialogType("edit");
    setSubDomainInput(sd.subdomain);
    setMarketingSourceInput(sd.marketingSource || "");
    setIsPrimaryInput(sd.isPrimary);
    setCurrentId(sd.id);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSubDomainInput("");
    setMarketingSourceInput("");
    setIsPrimaryInput(false);
    setCurrentId(null);
    setDialogType(null);
  };

  const handleDialogConfirm = async () => {
    if (!subDomainInput.trim() || !brandId) return;

    setActionLoading(true);
    try {
      if (dialogType === "add") {
        await createBrandSubDomain(
          brandId,
          subDomainInput.trim(),
          marketingSourceInput.trim(),
          isPrimaryInput
        );
      } else if (dialogType === "edit" && currentId) {
        await updateBrandSubDomain(
          brandId,
          currentId,
          subDomainInput.trim(),
          marketingSourceInput.trim(),
          isPrimaryInput
        );
      }
      handleDialogClose();
      load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!brandId) return;
    setActionLoading(true);
    try {
      await deleteBrandSubDomain(brandId, id);
      load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDisable = async (id: string, isDisabled: boolean) => {
    if (!brandId) return;
    setActionLoading(true);
    try {
      await toggleBrandSubDomainDisabled(brandId, id, isDisabled);
      load();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-[var(--border)]">
      <h2 className="text-2xl font-bold mb-6">Brand Sub Domains</h2>
      <p className="mb-6 text-gray-600">
        Request sub domains for your brand. Requests will be reviewed within 24-48 hours.
      </p>

      <div className="mb-6">
        <Button variant="primary" onClick={openAddDialog}>Add Sub Domain</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-[var(--color-outline)] rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-[var(--color-surface-variant)]">
                <th className="p-3 border-b border-[var(--color-outline)] text-left">Sub Domain</th>
                <th className="p-3 border-b border-[var(--color-outline)] text-left">Marketing Source</th>
                <th className="p-3 border-b border-[var(--color-outline)] text-center">Status</th>
                <th className="p-3 border-b border-[var(--color-outline)] text-center">Primary</th>
                <th className="p-3 border-b border-[var(--color-outline)] text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subDomains.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center p-4 opacity-60">
                    No sub domains found.
                  </td>
                </tr>
              )}
              {subDomains.map((sd) => (
                <tr key={sd.id} className="hover:bg-[var(--color-surface-variant)] transition">
                  <td className="p-3 border-b border-[var(--color-outline)]">{sd.subdomain}</td>
                  <td className="p-3 border-b border-[var(--color-outline)]">{sd.marketingSource || '-'}</td>
                  <td className="p-3 border-b border-[var(--color-outline)] text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${!sd.isDisabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {!sd.isDisabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-3 border-b border-[var(--color-outline)] text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${sd.isPrimary ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {sd.isPrimary ? 'Primary' : 'Secondary'}
                    </span>
                  </td>
                  <td className="p-3 border-b border-[var(--color-outline)] flex gap-2">
                    <Button 
                      variant={sd.isDisabled ? "outline" : "primary"} 
                      size="sm" 
                      onClick={() => handleToggleDisable(sd.id, !sd.isDisabled)}
                    >
                      {sd.isDisabled ? "Enable" : "Disable"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(sd)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(sd.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <Dialog isOpen={dialogOpen} onClose={handleDialogClose} title={dialogType === 'add' ? "Add Sub Domain" : "Edit Sub Domain"}>
          <div className="space-y-4">
            <div>
              <label htmlFor="subdomain" className="block text-sm font-medium mb-1">Sub Domain</label>
              <input
                id="subdomain"
                name="subdomain"
                className="border border-[var(--color-outline)] rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="Enter sub domain"
                value={subDomainInput}
                onChange={e => setSubDomainInput(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="marketingSource" className="block text-sm font-medium mb-1">Marketing Source</label>
              <input
                id="marketingSource"
                name="marketingSource"
                className="border border-[var(--color-outline)] rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="Enter marketing source"
                value={marketingSourceInput}
                onChange={e => setMarketingSourceInput(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="isPrimary" className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  name="isPrimary"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={isPrimaryInput}
                  onChange={e => setIsPrimaryInput(e.target.checked)}
                />
                <span className="text-sm font-medium">Set as Primary Domain</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleDialogClose}>Cancel</Button>
              <Button variant="primary" onClick={handleDialogConfirm} loading={actionLoading}>
                {dialogType === "add" ? "Add" : "Save"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
