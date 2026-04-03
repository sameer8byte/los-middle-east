import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Dialog from "../../../../common/dialog";
import { LoanRiskCategory } from "../../../../constant/enum";
import { useQueryParams } from "../../../../hooks/useQueryParams";
import { LoanRulesTenures } from "./loanRuleTanures";
import {
  getLoanRules,
  patchLoanRules,
} from "../../../../shared/services/api/settings/loanRules.setting.api";
import { LoanRule } from "../../../../shared/types/loan";
import { Button } from "../../../../common/ui/button";
import { Conversion } from "../../../../utils/conversion";
// import { LoanRulesPenalty } from "./loanRulesPenalty";

export function LoanRules() {
  const { setQuery, getQuery } = useQueryParams();
  const tenureLoanRuleId = getQuery("tenureLoanRuleId");

  const { brandId } = useParams<{ brandId: string }>();
  const [rules, setRules] = useState<LoanRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ruleType: "",
    minAmount: "",
    maxAmount: "",
    isActive: "true",
    maxCompleteLoanCount: "",
  });

  useEffect(() => {
    if (!brandId) {
      setError("Brand ID is not provided");
      setLoading(false);
      return;
    }

    const fetchRules = async () => {
      try {
        setLoading(true);
        const response = await getLoanRules(brandId);
        setRules(response);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch loan rules:", error);
        setError("Failed to load loan rules. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [brandId]);

  const openCreateDialog = () => {
    setFormData({
      ruleType: "",
      minAmount: "",
      maxAmount: "",
      isActive: "true",
      maxCompleteLoanCount: "",
    });
    setIsEditing(false);
    setCurrentEditId(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (rule: LoanRule) => {
    setFormData({
      ruleType: rule.ruleType,
      minAmount: rule.minAmount.toString(),
      maxAmount: rule.maxAmount.toString(),
      isActive: rule.isActive ? "true" : "false",
      maxCompleteLoanCount: rule.maxCompleteLoanCount?.toString() || "",
    });
    setIsEditing(true);
    setCurrentEditId(rule.id);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!brandId) return;

    const payload = {
      ruleType: formData.ruleType as LoanRiskCategory,
      minAmount: parseFloat(formData.minAmount),
      maxAmount: parseFloat(formData.maxAmount),
      maxCompleteLoanCount: formData.maxCompleteLoanCount
        ? parseInt(formData.maxCompleteLoanCount)
        : undefined,
      isActive: formData.isActive === "true",
      id: currentEditId ?? null,
    };

    try {
      const response = await patchLoanRules(brandId, payload);
      if (isEditing) {
        setRules((prev) =>
          prev.map((rule) => (rule.id === response.id ? response : rule))
        );
      } else {
        setRules((prev) => [...prev, response]);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to save rule:", error);
      setFormError(
        "Failed to save rule. Please check your input and try again."
      );
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      {tenureLoanRuleId && <LoanRulesTenures />}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={isEditing ? "Edit Loan Rule" : "Create Loan Rule"}
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="ruleType"
              className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
            >
              Risk Category
            </label>
            <select
              id="ruleType"
              disabled={isEditing}
              name="ruleType"
              value={formData.ruleType}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg shadow-sm focus:border-[#EA5E18] focus:ring-[#EA5E18] focus:ring-1 disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed transition-colors"
            >
              <option value="">Select Risk Category</option>
              {[
                "very_poor",
                "poor",
                "medium",
                "high",
                "very_high",

                "low",
                "moderate",
                "good",
                "excellent",
                "exceptional",

                "subprime",
                "near_prime",
                "prime",
                "super_prime",
                "ultra_prime",
                // Custom categories        
                "mig_cat_1",
                "mig_cat_2",
                "mig_cat_3",
                "mig_cat_4",
                "mig_cat_5",
                "mig_cat_6",
                "mig_cat_7",
                "mig_cat_8",
                "mig_cat_9",
                "mig_cat_10",
                "mig_cat_11",
                "mig_cat_12",
                "mig_cat_13",
                "mig_cat_14",
                "mig_cat_15",
                "mig_cat_16",
              ].map((category) => (
                <option key={category} value={category}>
                  {category.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="minAmount"
                className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
              >
                Min Amount
              </label>
              <div className="relative">
                {/* <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-on-surface)] opacity-70">
                  BHD
                </span> */}
                <input
                  id="minAmount"
                  name="minAmount"
                  value={formData.minAmount}
                  onChange={handleInputChange}
                  type="number"
                  required
                  placeholder="0"
                  className="w-full pl-2 pr-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg shadow-sm focus:border-[#EA5E18] focus:ring-[#EA5E18] focus:ring-1 transition-colors"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="maxAmount"
                className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
              >
                Max Amount
              </label>
              <div className="relative">
                {/* <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-on-surface)] opacity-70">
                  ₹
                </span> */}
                <input
                  id="maxAmount"
                  name="maxAmount"
                  value={formData.maxAmount}
                  onChange={handleInputChange}
                  type="number"
                  required
                  placeholder="0"
                  className="w-full pl-2 pr-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg shadow-sm focus:border-[#EA5E18] focus:ring-[#EA5E18] focus:ring-1 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="isActive"
                className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
              >
                Status
              </label>
              <select
                id="isActive"
                name="isActive"
                value={formData.isActive}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg shadow-sm focus:border-[#EA5E18] focus:ring-[#EA5E18] focus:ring-1 transition-colors"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="maxCompleteLoanCount"
                className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2"
              >
                Max Complete Loan Count
              </label>
              <input
                id="maxCompleteLoanCount"
                name="maxCompleteLoanCount"
                value={formData.maxCompleteLoanCount}
                onChange={handleInputChange}
                type="number"
                required
                placeholder="Enter count"
                className="w-full px-4 py-3 border border-[var(--color-muted)] border-opacity-50 rounded-lg shadow-sm focus:border-[#EA5E18] focus:ring-[#EA5E18] focus:ring-1 transition-colors"
              />
            </div>
          </div>

          {formError && (
            <div className="flex items-center p-4 text-[var(--color-on-error)] bg-[var(--color-error)] bg-opacity-10 border border border-[var(--color-error)] border-opacity-30 rounded-lg">
              <svg
                className="w-5 h-5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">{formError}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-[var(--color-muted)] border-opacity-30">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEditing ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </form>
      </Dialog>

      <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-[var(--color-muted)] border-opacity-30">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-on-background)] mb-2">
              Loan Rules
            </h1>
            <p className="text-sm text-[var(--color-on-surface)] opacity-70">
              Manage your loan rule configurations and risk categories
            </p>
          </div>
          <Button onClick={openCreateDialog} variant="secondary">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add New Rule
          </Button>
        </div>

        {error && (
          <div className="mb-6 flex items-center p-4 text-[var(--color-on-error)] bg-[var(--color-error)] bg-opacity-10 border border border-[var(--color-error)] border-opacity-30 rounded-lg">
            <svg
              className="w-5 h-5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {["row1", "row2", "row3", "row4", "row5"].map((id) => (
              <div
                key={id}
                className="animate-pulse h-16 bg-[var(--color-muted)] bg-opacity-30 rounded-lg"
              ></div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-muted)] border-opacity-30 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[var(--color-background)]">
                <tr>
                  {[
                    "Risk Category",
                    "Status",
                    "Min Amount",
                    "Max Amount",
                    "Max Loan Count",
                    "Tenures",
                    "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rules.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-[var(--color-on-surface)] opacity-70"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-[var(--color-surface)] rounded-full flex items-center justify-center mb-4">
                          <svg
                            className="w-8 h-8 text-[var(--color-on-surface)] opacity-50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-[var(--color-on-background)] mb-2">
                          No loan rules found
                        </h3>
                        <p className="text-sm text-[var(--color-on-surface)] opacity-70 mb-4">
                          Get started by creating your first loan rule
                        </p>
                        <button
                          onClick={openCreateDialog}
                          className="bg-[#EA5E18] text-white px-4 py-2 rounded-lg hover:bg-[#d54e13] transition-colors"
                        >
                          Create Rule
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rules
                    .filter((rule) => !rule.isDisabled && rule.isVisible)
                    .map((rule) => (
                      <tr
                        key={rule.id}
                        className="hover:bg-[var(--color-background)] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-primary)] bg-opacity-15 text-[var(--color-on-primary)]">
                            {rule.ruleType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              rule.isActive
                                ? "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)]"
                                : "bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)]"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 mr-2 rounded-full ${
                                rule.isActive
                                  ? "bg-[var(--color-success)] bg-opacity-100"
                                  : "bg-[var(--color-error)] bg-opacity-100"
                              }`}
                            ></span>
                            {rule.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-[var(--color-on-background)]">
                          {Conversion.formatCurrency(rule.minAmount)}
                        </td>
                        <td className="px-6 py-4 font-medium text-[var(--color-on-background)]">
                          {Conversion.formatCurrency(rule.maxAmount)}  
                        </td> 
                        <td className="px-6 py-4 text-[var(--color-on-surface)] opacity-70">
                          {rule.maxCompleteLoanCount || "N/A"}
                        </td>
                        <td className="px-6 py-4"> 
                          <Button
                            onClick={() =>
                              setQuery("tenureLoanRuleId", rule.id)
                            }
                            variant="secondary"
                          >
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            View Tenures
                          </Button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openEditDialog(rule)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-[var(--color-on-primary)] bg-[var(--color-primary)] bg-opacity-10 rounded-md hover:bg-[var(--color-primary)] bg-opacity-15 transition-colors"
                              title="Edit rule"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              Edit
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
      </div>
    </>
  );
}
