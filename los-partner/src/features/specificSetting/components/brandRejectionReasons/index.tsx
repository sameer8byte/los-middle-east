import React, { useEffect, useState } from "react";
import {
  BrandRejectionReason,
  BrandRejectionReasonApi,
  RejectionType,
  BrandStatusType,
} from "../../../../shared/services/api/settings/brandRejectionReaons.setting.api";
import { useParams } from "react-router-dom";

// ✅ React Icons
import { HiPlus, HiPencil, HiDocumentText } from "react-icons/hi";
import { Button } from "../../../../common/ui/button";

const defaultFormState = {
  reason: "",
  type: "USER" as RejectionType,
  status: "REJECTED" as BrandStatusType,
  isDisabled: false,
  isActive: true,
};

export const BrandRejectionReasons = () => {
  const { brandId } = useParams<{ brandId: string }>();

  const [reasons, setReasons] = useState<BrandRejectionReason[]>([]);
  const [form, setForm] = useState(defaultFormState);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReasons = async () => {
    if (!brandId) return;
    const data = await BrandRejectionReasonApi.getAll(brandId);
    setReasons(data);
  };

  useEffect(() => {
    fetchReasons();
  }, [brandId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    
    // If changing type, reset status to a valid one for the new type
    if (name === "type") {
      const newType = value as RejectionType;
      let newStatus = form.status;
      
      // Reset status to REJECTED if it becomes invalid for the new type
      if ((newType === "USER" && form.status === "APPROVED") ||
          (newType !== "USER" && ["HOLD", "ACTIVE", "PENDING"].includes(form.status))) {
        newStatus = "REJECTED";
      }
      
      setForm({
        ...form,
        type: newType,
        status: newStatus,
      });
    } else {
      setForm({
        ...form,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId) return;
    setLoading(true);

    try {
      if (editId) {
        await BrandRejectionReasonApi.update(brandId, editId, form);
      } else {
        await BrandRejectionReasonApi.create(brandId, form);
      }
      await fetchReasons();
      setForm(defaultFormState);
      setEditId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (reason: BrandRejectionReason) => {
    setEditId(reason.id);
    setForm({
      reason: reason.reason,
      type: reason.type,
      status: reason.status,
      isActive: reason.isActive,
      isDisabled: reason.isDisabled,
    });
  };

  const cancelEdit = () => {
    setForm(defaultFormState);
    setEditId(null);
  };

 const getStatusBadge = (reason: BrandRejectionReason) => {
    if (reason.isDisabled) {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-red-600 text-white">
          Disabled
        </span>
      );
    }

    if (reason.isActive) {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-600 text-white">
          Active
        </span>
      );
    }

    return (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gray-500 text-white">
        Inactive
      </span>
    );
  };

  const getBrandStatusClass = (status: BrandStatusType) => {
     switch (status) {
    case 'APPROVED':
      return 'bg-green-600 text-white';
    case 'ACTIVE':
      return 'bg-green-600 text-white';
    case 'PENDING':
      return 'bg-yellow-500 text-white';
    case 'HOLD':
      return 'bg-yellow-500 text-white';
    case 'REJECTED':
    default:
      return 'bg-red-600 text-white';
  }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-primary rounded-xl p-8 text-[var(--color-on-primary)] shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Brand Status Reasons</h1>
        <p className="text-[var(--color-on-primary)] opacity-90 text-lg">
          Manage approval and rejection reasons for brand applications
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-[var(--color-background)] rounded-xl shadow-lg border border-[var(--color-muted)] border-opacity-20 overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div className="bg-gradient-to-r from-[var(--color-surface)] to-[var(--color-surface)] px-6 py-5 border-b border-[var(--color-muted)] border-opacity-20">
          <h2 className="text-xl font-semibold text-[var(--color-on-background)] flex items-center">
            <HiPlus className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
            {editId ? "Edit Status Reason" : "Add New Status Reason"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <label htmlFor="reason" className="block text-sm font-semibold text-[var(--color-on-background)] mb-2">
                Reason *
              </label>
              <input
                id="reason"
                name="reason"
                type="text"
                className="w-full px-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors duration-200 bg-[var(--color-background)] text-[var(--color-on-background)]"
                placeholder="Enter rejection reason..."
                value={form.reason}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-semibold text-[var(--color-on-background)] mb-2">
                Type
              </label>
              <select
                id="type"
                name="type"
                className="w-full px-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors duration-200 bg-[var(--color-background)] text-[var(--color-on-background)]"
                value={form.type}
                onChange={handleInputChange}
              >
                <option value="USER">User</option>
                <option value="LOAN">Loan</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-[var(--color-on-background)] mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                className="w-full px-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors duration-200 bg-[var(--color-background)] text-[var(--color-on-background)]"
                value={form.status}
                onChange={handleInputChange}
              >
                <option value="REJECTED">Rejected</option>
                {form.type !== "USER" && (
                  <option value="APPROVED">Approved</option>
                )}
                {form.type === "USER" && (
                  <>
                    <option value="HOLD">Hold</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                  </>
                )}
              </select>
            </div>

            <div className="md:col-span-3 flex items-center space-x-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-[var(--color-on-success)] border-[var(--color-muted)] border-opacity-50 rounded focus:ring-[var(--color-success)]"
                />
                <span className="text-sm font-medium text-[var(--color-on-background)]">Active</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isDisabled"
                  checked={form.isDisabled}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-[var(--color-on-error)] border-[var(--color-muted)] border-opacity-50 rounded focus:ring-[var(--color-error)]"
                />
                <span className="text-sm font-medium text-[var(--color-on-background)]">Disabled</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-muted)] border-opacity-30">
            <div className="flex items-center space-x-3">
              <Button
                type="submit"
                disabled={loading}
                loading={loading}
              >
               
                <span>{editId ? "Update Reason" : "Create Reason"}</span>
              </Button>

              {editId && (
                <Button
                  type="button"
                  onClick={cancelEdit}
                  variant="surface"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="bg-[var(--color-background)] rounded-xl shadow-lg border border-[var(--color-muted)] border-opacity-30 overflow-hidden">
        <div className="bg-[var(--color-surface)] px-6 py-4 border-b border-[var(--color-muted)] border-opacity-30">
          <h2 className="text-lg font-semibold text-[var(--color-on-background)]">Existing Reasons</h2>
          <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">Manage all status reasons for this brand</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-muted)] border-opacity-30">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">Brand Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">Record Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-30">
              {reasons.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--color-surface)] transition-colors duration-150">
                  <td className="px-6 py-4 text-sm text-[var(--color-on-background)]">{r.reason}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                      r.type === 'USER' 
                        ? 'bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-on-primary)]' 
                        : 'bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-on-secondary)]'
                    }`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getBrandStatusClass(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(r)}</td>
             <td className="px-6 py-4 text-right">
  <button
    className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-700 rounded-lg transition-colors duration-150 shadow-sm hover:shadow-md"
    onClick={() => handleEdit(r)}
  >
    <HiPencil className="w-4 h-4 mr-1" />
    Edit
  </button>
</td>
                </tr>
              ))}
              {reasons.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <HiDocumentText className="w-12 h-12 text-[var(--color-muted)]" />
                      <p className="text-[var(--color-on-surface)] opacity-70 font-medium">No status reasons found</p>
                      <p className="text-[var(--color-on-surface)] opacity-50 text-sm">Create your first status reason using the form above</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
