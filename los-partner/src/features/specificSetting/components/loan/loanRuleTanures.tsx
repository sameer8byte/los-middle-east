import { useEffect, useState } from "react";
import Sidebar from "../../../../common/sidebar";
import { useQueryParams } from "../../../../hooks/useQueryParams";

import { useParams } from "react-router-dom";

import Dialog from "../../../../common/dialog";
import {
  FeeValueType,
  LoanTypeEnum,
  PenaltyType,
  TaxType,
  FeeType,
  ChargeMode,
} from "../../../../constant/enum";
import {
  LoanChargeConfig,
  LoanChargeTax,
  LoanPenalty,
  Tenure,
} from "../../../../shared/types/loan";
import {
  getTenures,
  patchLoanRuleTenures,
  patchLoanPenalty,
  patchLoanChargeConfig,
  patchLoanChargeTaxes,
} from "../../../../shared/services/api/settings/loanRules.setting.api";
import { Button } from "../../../../common/ui/button";

export function LoanRulesTenures() {
  const { brandId } = useParams<{ brandId: string }>();
  const { getQuery, removeQuery } = useQueryParams();
  const tenureLoanRuleId = getQuery("tenureLoanRuleId");

  const [upsertPenalty, setUpsertPenalty] = useState<boolean>(false);
  const [selectedPenalty, setSelectedPenalty] = useState<LoanPenalty | null>(
    null
  );

  const [upsertTenure, setUpsertTenure] = useState<boolean>(false);
  const [selectedTenure, setSelectedTenure] = useState<Tenure | null>(null);

  // Charge Config states
  const [upsertChargeConfig, setUpsertChargeConfig] = useState<boolean>(false);
  const [selectedChargeConfig, setSelectedChargeConfig] =
    useState<LoanChargeConfig | null>(null);

  // Charge Tax states
  const [upsertChargeTax, setUpsertChargeTax] = useState<boolean>(false);
  const [selectedChargeTax, setSelectedChargeTax] =
    useState<LoanChargeTax | null>(null);
  const [selectedChargeConfigForTax, setSelectedChargeConfigForTax] =
    useState<string>("");

  const [tenures, setTenures] = useState<
    (Tenure & {
      loanPenalty: LoanPenalty[];
      loan_charge_config: (LoanChargeConfig & {
        loan_charge_taxes: LoanChargeTax[];
      })[];
    })[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [penaltyLoading, setPenaltyLoading] = useState<boolean>(false);
  const [tenureLoading, setTenureLoading] = useState<boolean>(false);
  const [chargeConfigLoading, setChargeConfigLoading] =
    useState<boolean>(false);
  const [chargeTaxLoading, setChargeTaxLoading] = useState<boolean>(false);

  // Penalty form state
  const [penaltyForm, setPenaltyForm] = useState({
    type: "" as PenaltyType,
    valueType: "" as FeeValueType,
    chargeValue: 0,
    taxType: "" as TaxType,
    taxChargeValue: 0,
    isTaxInclusive: false,
    taxValueType: "" as FeeValueType,
  });

  // Tenure form state
  const [tenureForm, setTenureForm] = useState({
    loanRuleId: "",
    minTermDays: 7,
    maxTermDays: 40,
    minPostActiveTermDays: 0,
    allowPrepayment: false,
    gracePeriod: 0, // in days
    isActive: true,
    loan_type: "" as LoanTypeEnum,
  });

  // Charge Config form state
  const [chargeConfigForm, setChargeConfigForm] = useState({
    type: "" as FeeType,
    valueType: "" as FeeValueType,
    chargeValue: 0,
    isActive: true,
    chargeMode: "" as ChargeMode,
    isRecurringDaily: false,
  });

  // Charge Tax form state
  const [chargeTaxForm, setChargeTaxForm] = useState({
    type: "" as TaxType,
    chargeValue: 0,
    valueType: "" as FeeValueType,
    isInclusive: false,
  });

  useEffect(() => {
    if (!tenureLoanRuleId || !brandId) return;

    const fetchTenures = async () => {
      setLoading(true);
      try {
        const response = await getTenures(brandId, tenureLoanRuleId);
        if (response) {
          setTenures(response);
        }
      } catch (err) {
        console.error("Error fetching tenures:", err);
        setError("Failed to fetch tenures");
      } finally {
        setLoading(false);
      }
    };

    fetchTenures();
  }, [tenureLoanRuleId, brandId]);

  const handleTenureSubmit = async () => {
    if (!brandId) return;

    setTenureLoading(true);
    try {
      const response = await patchLoanRuleTenures(brandId, {
        id: selectedTenure?.id || "",
        loanRuleId: tenureForm.loanRuleId,
        minTermDays: tenureForm.minTermDays,
        maxTermDays: tenureForm.maxTermDays || 40, // Default to 40 if not set
        minPostActiveTermDays: tenureForm.minPostActiveTermDays,
        allowPrepayment: tenureForm.allowPrepayment,
        gracePeriod: tenureForm.gracePeriod,
        isActive: tenureForm.isActive,
        loan_type: tenureForm.loan_type,
      });
      if (response) {
        setUpsertTenure(false);
      }
    } catch (err) {
      console.error("Error updating tenure:", err);
    } finally {
      setTenureLoading(false);
    }
  };

  const handlePenaltySubmit = async () => {
    if (!brandId || !selectedTenure) return;

    setPenaltyLoading(true);
    try {
      const payload = {
        // Include ID only if we're updating an existing penalty, otherwise omit it for creation
        ...(selectedPenalty?.id ? { id: selectedPenalty.id } : {}),
        type: penaltyForm.type,
        valueType: penaltyForm.valueType,
        chargeValue: penaltyForm.chargeValue,
        taxType: penaltyForm.taxType,
        taxChargeValue: penaltyForm.taxChargeValue,
        isTaxInclusive: penaltyForm.isTaxInclusive,
        loanRuleId: selectedPenalty?.loanRuleId || tenureLoanRuleId || "",
        tenureId: selectedPenalty?.tenureId || selectedTenure.id,
        taxValueType: penaltyForm.taxValueType,
      };

      const response = await patchLoanPenalty(brandId, payload);
      if (response) {
        // Refresh tenures data after successful update/create
        const updatedTenures = await getTenures(
          brandId,
          tenureLoanRuleId || ""
        );
        if (updatedTenures) {
          setTenures(updatedTenures);
        }
        setUpsertPenalty(false);
        setSelectedPenalty(null);
      }
    } catch (err) {
      console.error("Error updating/creating penalty:", err);
    } finally {
      setPenaltyLoading(false);
    }
  };

  const handleChargeConfigSubmit = async () => {
    if (!brandId) return;

    setChargeConfigLoading(true);
    try {
      const payload = {
        ...(selectedChargeConfig?.id && { id: selectedChargeConfig.id }), // Only include ID if updating existing record
        loanRuleId: selectedChargeConfig?.loanRuleId || tenureLoanRuleId || "",
        tenureId: selectedChargeConfig?.tenureId || selectedTenure?.id || "",
        type: chargeConfigForm.type,
        valueType: chargeConfigForm.valueType,
        chargeValue: chargeConfigForm.chargeValue,
        isActive: chargeConfigForm.isActive,
        chargeMode: chargeConfigForm.chargeMode,
        isRecurringDaily: chargeConfigForm.isRecurringDaily,
      };

      const response = await patchLoanChargeConfig(brandId, payload);
      if (response) {
        // Refresh tenures data after successful update/create
        const updatedTenures = await getTenures(
          brandId,
          tenureLoanRuleId || ""
        );
        if (updatedTenures) {
          setTenures(updatedTenures);
        }
        setUpsertChargeConfig(false);
        setSelectedChargeConfig(null);
      }
    } catch (err) {
      console.error("Error updating/creating charge config:", err);
    } finally {
      setChargeConfigLoading(false);
    }
  };

  const handleChargeTaxSubmit = async () => {
    if (!brandId) return;

    setChargeTaxLoading(true);
    try {
      const payload = {
        ...(selectedChargeTax?.id && { id: selectedChargeTax.id }), // Only include ID if updating existing record
        type: chargeTaxForm.type,
        chargeValue: chargeTaxForm.chargeValue,
        isInclusive: chargeTaxForm.isInclusive,
        loanChargeConfigId: selectedChargeConfigForTax,
        valueType: chargeTaxForm.valueType, // Default value type for tax
      };

      const response = await patchLoanChargeTaxes(brandId, payload);
      if (response) {
        // Refresh tenures data after successful update/create
        const updatedTenures = await getTenures(
          brandId,
          tenureLoanRuleId || ""
        );
        if (updatedTenures) {
          setTenures(updatedTenures);
        }
        setUpsertChargeTax(false);
        setSelectedChargeTax(null);
        setSelectedChargeConfigForTax("");
      }
    } catch (err) {
      console.error("Error updating/creating charge tax:", err);
    } finally {
      setChargeTaxLoading(false);
    }
  };

  return (
    <div>
      {/* Tenure Update Dialog */}
      {upsertTenure && (
        <Dialog
          isOpen={upsertTenure}
          onClose={() => setUpsertTenure(false)}
          title="Update Tenure"
        >
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTenureSubmit();
              }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    min Duration (days)
                  </label>

                  <select
                    value={tenureForm.minTermDays}
                    onChange={(e) =>
                      setTenureForm({
                        ...tenureForm,
                        loanRuleId: tenureLoanRuleId || "",
                        minTermDays: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    required
                  >
                    <option value="">Select duration</option>
                    {[7, 14, 30, 60, 90, 180, 365].map((day) => (
                      <option key={day} value={day}>
                        {day} {day === 1 ? "day" : "days"}
                      </option>
                    ))}
                  </select>
                </div>
                {/* // max Duration (days)  */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    Max Duration (days)
                  </label>
                  <select
                    value={tenureForm.maxTermDays}
                    onChange={(e) =>
                      setTenureForm({
                        ...tenureForm,
                        maxTermDays: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    required
                  >
                    <option value="">Select duration</option>
                    {[7, 14, 30, 40, 60, 90, 180, 365].map((day) => (
                      <option key={day} value={day}>
                        {day} {day === 1 ? "day" : "days"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    Loan Type
                  </label>
                  <select
                    value={tenureForm.loan_type}
                    onChange={(e) =>
                      setTenureForm({
                        ...tenureForm,
                        loan_type: e.target.value as LoanTypeEnum,
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    required
                  >
                    <option value="">Select loan type</option>
                    {Object.values(LoanTypeEnum).map((type) => (
                      <option key={type} value={type}>
                        {type
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    Min Post Active Term Days
                  </label>
                  <input
                    type="number"
                    value={tenureForm.minPostActiveTermDays}
                    onChange={(e) =>
                      setTenureForm({
                        ...tenureForm,
                        minPostActiveTermDays: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="Enter post active term days"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    Grace Period (days)
                  </label>
                  <input
                    type="number"
                    value={tenureForm.gracePeriod}
                    onChange={(e) =>
                      setTenureForm({
                        ...tenureForm,
                        gracePeriod: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="Enter grace period in days"
                    min="0"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowPrepayment"
                    checked={tenureForm.allowPrepayment}
                    onChange={(e) =>
                      setTenureForm({
                        ...tenureForm,
                        allowPrepayment: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-[var(--color-on-primary)] focus:ring-primary border-[var(--color-muted)] border-opacity-50 rounded"
                  />
                  <label
                    htmlFor="allowPrepayment"
                    className="ml-2 block text-sm text-[var(--color-on-surface)] opacity-80"
                  >
                    Allow prepayment
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={tenureForm.isActive}
                    onChange={(e) =>
                      setTenureForm({
                        ...tenureForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-[var(--color-on-primary)] focus:ring-primary border-[var(--color-muted)] border-opacity-50 rounded"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 block text-sm text-[var(--color-on-surface)] opacity-80"
                  >
                    Active tenure
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--color-muted)] border-opacity-30">
                <button
                  type="button"
                  onClick={() => setUpsertTenure(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[var(--color-on-surface)] opacity-80 var(--color-background) border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm hover:bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tenureLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] bg-[var(--color-primary)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {tenureLoading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-[var(--color-on-primary)]"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    "Update Tenure"
                  )}
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* Penalty Update Dialog */}
      {upsertPenalty && (
        <Dialog
          isOpen={upsertPenalty}
          onClose={() => {
            setUpsertPenalty(false);
          }}
          title={selectedPenalty ? "Update Penalty" : "Add New Penalty"}
        >
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePenaltySubmit();
              }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    Penalty Type
                  </label>
                  <select
                    value={penaltyForm.type}
                    onChange={(e) =>
                      setPenaltyForm({
                        ...penaltyForm,
                        type: e.target.value as PenaltyType,
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    required
                  >
                    <option value="">Select penalty type</option>
                    {Object.values(PenaltyType).map((type) => (
                      <option key={type} value={type}>
                        {type
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                      Charge Value
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={penaltyForm.chargeValue}
                      onChange={(e) =>
                        setPenaltyForm({
                          ...penaltyForm,
                          chargeValue: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                      Value Type
                    </label>
                    <select
                      value={penaltyForm.valueType}
                      onChange={(e) =>
                        setPenaltyForm({
                          ...penaltyForm,
                          valueType: e.target.value as FeeValueType,
                        })
                      }
                      className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      required
                    >
                      <option value="">Select type</option>
                      {Object.values(FeeValueType).map((type) => (
                        <option key={type} value={type}>
                          {type
                            .replace(/_/g, " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-[var(--color-muted)] border-opacity-30 pt-4">
                  <h4 className="text-sm font-medium text-[var(--color-on-background)] mb-3">
                    Tax Settings
                  </h4>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                        Tax Type
                      </label>
                      <select
                        value={penaltyForm.taxType}
                        onChange={(e) =>
                          setPenaltyForm({
                            ...penaltyForm,
                            taxType: e.target.value as TaxType,
                          })
                        }
                        className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      >
                        <option value="">Select tax type</option>
                        {Object.values(TaxType).map((type) => (
                          <option key={type} value={type}>
                            {type
                              .replace(/_/g, " ")
                              .toLowerCase()
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                        Tax Charge Value
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={penaltyForm.taxChargeValue}
                        onChange={(e) =>
                          setPenaltyForm({
                            ...penaltyForm,
                            taxChargeValue: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  {/* //taxValueType */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                      Tax Value Type
                    </label>
                    <select
                      value={penaltyForm.taxValueType}
                      onChange={(e) =>
                        setPenaltyForm({
                          ...penaltyForm,
                          taxValueType: e.target.value as FeeValueType,
                        })
                      }
                      className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    >
                      <option value="">Select type</option>
                      {Object.values(FeeValueType).map((type) => (
                        <option key={type} value={type}>
                          {type
                            .replace(/_/g, " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isTaxInclusive"
                      checked={penaltyForm.isTaxInclusive}
                      onChange={(e) =>
                        setPenaltyForm({
                          ...penaltyForm,
                          isTaxInclusive: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-[var(--color-on-primary)] focus:ring-primary border-[var(--color-muted)] border-opacity-50 rounded"
                    />
                    <label
                      htmlFor="isTaxInclusive"
                      className="ml-2 block text-sm text-[var(--color-on-surface)] opacity-80"
                    >
                      Tax inclusive
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--color-muted)] border-opacity-30">
                <button
                  type="button"
                  onClick={() => setUpsertPenalty(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[var(--color-on-surface)] opacity-80 var(--color-background) border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm hover:bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={penaltyLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] bg-[var(--color-primary)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {penaltyLoading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-[var(--color-on-primary)]"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Updating...
                    </span>
                  ) : selectedPenalty ? (
                    "Update Penalty"
                  ) : (
                    "Add Penalty"
                  )}
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* Charge Config Update Dialog */}
      {upsertChargeConfig && (
        <Dialog
          isOpen={upsertChargeConfig}
          onClose={() => setUpsertChargeConfig(false)}
          title={
            selectedChargeConfig
              ? "Update Charge Config"
              : "Add New Charge Config"
          }
        >
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChargeConfigSubmit();
              }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    Charge Type
                  </label>
                  <select
                    value={chargeConfigForm.type}
                    onChange={(e) =>
                      setChargeConfigForm({
                        ...chargeConfigForm,
                        type: e.target.value as FeeType,
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    required
                  >
                    <option value="">Select charge type</option>
                    {Object.values(FeeType).map((type) => (
                      <option key={type} value={type}>
                        {type
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    Charge Value
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={chargeConfigForm.chargeValue}
                    onChange={(e) =>
                      setChargeConfigForm({
                        ...chargeConfigForm,
                        chargeValue: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    Value Type
                  </label>
                  <select
                    value={chargeConfigForm.valueType}
                    onChange={(e) =>
                      setChargeConfigForm({
                        ...chargeConfigForm,
                        valueType: e.target.value as FeeValueType,
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    required
                  >
                    <option value="">Select type</option>
                    {Object.values(FeeValueType).map((type) => (
                      <option key={type} value={type}>
                        {type
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    Charge Mode
                  </label>
                  <select
                    value={chargeConfigForm.chargeMode}
                    onChange={(e) =>
                      setChargeConfigForm({
                        ...chargeConfigForm,
                        chargeMode: e.target.value as ChargeMode,
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    required
                  >
                    <option value="">Select charge mode</option>
                    {Object.values(ChargeMode).map((mode) => (
                      <option key={mode} value={mode}>
                        {mode
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isRecurringDaily"
                    checked={chargeConfigForm.isRecurringDaily}
                    onChange={(e) =>
                      setChargeConfigForm({
                        ...chargeConfigForm,
                        isRecurringDaily: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-[var(--color-on-primary)] focus:ring-primary border-[var(--color-muted)] border-opacity-50 rounded"
                  />
                  <label
                    htmlFor="isRecurringDaily"
                    className="ml-2 block text-sm text-[var(--color-on-surface)] opacity-80"
                  >
                    Recurring daily charge
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActiveConfig"
                    checked={chargeConfigForm.isActive}
                    onChange={(e) =>
                      setChargeConfigForm({
                        ...chargeConfigForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-[var(--color-on-primary)] focus:ring-primary border-[var(--color-muted)] border-opacity-50 rounded"
                  />
                  <label
                    htmlFor="isActiveConfig"
                    className="ml-2 block text-sm text-[var(--color-on-surface)] opacity-80"
                  >
                    Active charge config
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--color-muted)] border-opacity-30">
                <button
                  type="button"
                  onClick={() => setUpsertChargeConfig(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[var(--color-on-surface)] opacity-80 var(--color-background) border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm hover:bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={chargeConfigLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] bg-[var(--color-primary)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {chargeConfigLoading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-[var(--color-on-primary)]"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {selectedChargeConfig ? "Updating..." : "Adding..."}
                    </span>
                  ) : selectedChargeConfig ? (
                    "Update Charge Config"
                  ) : (
                    "Add Charge Config"
                  )}
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* Charge Tax Update Dialog */}
      {upsertChargeTax && (
        <Dialog
          isOpen={upsertChargeTax}
          onClose={() => setUpsertChargeTax(false)}
          title={selectedChargeTax ? "Update Charge Tax" : "Add New Charge Tax"}
        >
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChargeTaxSubmit();
              }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    Tax Type
                  </label>
                  <select
                    value={chargeTaxForm.type}
                    onChange={(e) =>
                      setChargeTaxForm({
                        ...chargeTaxForm,
                        type: e.target.value as TaxType,
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    required
                  >
                    <option value="">Select tax type</option>
                    {Object.values(TaxType).map((type) => (
                      <option key={type} value={type}>
                        {type
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    Tax Charge Value
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={chargeTaxForm.chargeValue}
                    onChange={(e) =>
                      setChargeTaxForm({
                        ...chargeTaxForm,
                        chargeValue: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] opacity-80 mb-2">
                    Value Type
                  </label>
                  <select
                    value={chargeTaxForm.valueType}
                    onChange={(e) =>
                      setChargeTaxForm({
                        ...chargeTaxForm,
                        valueType: e.target.value as FeeValueType,
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    required
                  >
                    <option value="">Select type</option>
                    {Object.values(FeeValueType).map((type) => (
                      <option key={type} value={type}>
                        {type
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isInclusive"
                    checked={chargeTaxForm.isInclusive}
                    onChange={(e) =>
                      setChargeTaxForm({
                        ...chargeTaxForm,
                        isInclusive: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-[var(--color-on-primary)] focus:ring-primary border-[var(--color-muted)] border-opacity-50 rounded"
                  />
                  <label
                    htmlFor="isInclusive"
                    className="ml-2 block text-sm text-[var(--color-on-surface)] opacity-80"
                  >
                    Inclusive
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--color-muted)] border-opacity-30">
                <button
                  type="button"
                  onClick={() => setUpsertChargeTax(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[var(--color-on-surface)] opacity-80 var(--color-background) border border-[var(--color-muted)] border-opacity-50 rounded-md shadow-sm hover:bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={chargeTaxLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] bg-[var(--color-primary)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {chargeTaxLoading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-[var(--color-on-primary)]"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {selectedChargeTax ? "Updating..." : "Adding..."}
                    </span>
                  ) : selectedChargeTax ? (
                    "Update Charge Tax"
                  ) : (
                    "Add Charge Tax"
                  )}
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      <Sidebar
        title="Loan Tenures"
        isOpen={!!tenureLoanRuleId}
        onClose={() => removeQuery("tenureLoanRuleId")}
      >
        <div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="animate-spin h-8 w-8 text-[var(--color-on-primary)] mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-[var(--color-on-surface)] opacity-70">
                  Loading tenures...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-[var(--color-on-error)]">
                <svg
                  className="h-8 w-8 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <p>{error}</p>
              </div>
            </div>
          ) : tenures.length ? (
            <div className="space-y-4">
              {tenures.map((tenure) => (
                <div
                  key={tenure.id}
                  className="var(--color-background) rounded-lg shadow-sm border border-[var(--color-muted)] border-opacity-30 overflow-hidden"
                >
                  <div className="p-4 border-b border-[var(--color-muted)] border-opacity-20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-[var(--color-primary)] bg-opacity-15 rounded-lg flex items-center justify-center">
                            <svg
                              className="h-5 w-5 text-[var(--color-on-primary)]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              ></path>
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-[var(--color-on-background)]">
                            {tenure.loan_type
                              .replace(/_/g, " ")
                              .toLowerCase()
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </h4>
                          <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                            {tenure.minTermDays} days
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tenure.isActive
                              ? "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)]"
                              : "bg-[var(--color-surface)] text-[var(--color-on-background)]"
                          }`}
                        >
                          {tenure.isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedTenure(tenure);
                            setTenureForm({
                              loanRuleId: tenure.loanRuleId,
                              minTermDays: tenure.minTermDays,
                              maxTermDays: tenure.maxTermDays,
                              minPostActiveTermDays:
                                tenure.minPostActiveTermDays || 0,
                              allowPrepayment: tenure.allowPrepayment || false,
                              gracePeriod: tenure.gracePeriod || 0,
                              isActive: tenure.isActive,
                              loan_type: tenure.loan_type,
                            });
                            setUpsertTenure(true);
                          }}
                          className="inline-flex items-center px-3 py-1 border border-[var(--color-muted)] border-opacity-50 shadow-sm text-xs font-medium rounded-md text-[var(--color-on-surface)] opacity-80 var(--color-background) hover:bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                        >
                          <svg
                            className="h-3 w-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            ></path>
                          </svg>
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>

                  {tenure.loanPenalty && tenure.loanPenalty.length > 0 && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-[var(--color-on-background)]">
                          Penalties
                        </h5>
                        <button
                          onClick={() => {
                            setSelectedTenure(tenure);
                            setSelectedPenalty(null);
                            setPenaltyForm({
                              type: "" as PenaltyType,
                              valueType: "" as FeeValueType,
                              chargeValue: 0,
                              taxType: "" as TaxType,
                              taxChargeValue: 0,
                              isTaxInclusive: false,
                              taxValueType: "" as FeeValueType,
                            });
                            setUpsertPenalty(true);
                          }}
                          className="
    inline-flex items-center gap-2
    px-3 py-1.5
    text-sm font-medium
    rounded-md
    transition-colors
    focus:outline-none
    focus:ring-2 focus:ring-[var(--color-primary)]
  "
                          style={{
                            backgroundColor: "var(--color-primary)",
                            color: "var(--color-on-primary)",
                          }}
                        >
                          <svg
                            className="h-3 w-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          Add New
                        </button>
                      </div>
                      <div className="space-y-3">
                        {tenure.loanPenalty.map((penalty) => (
                          <div
                            key={penalty.id}
                            className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-md"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-[var(--color-on-background)]">
                                  {penalty.type
                                    .replace(/_/g, " ")
                                    .toLowerCase()
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-primary)] bg-opacity-15 text-[var(--color-on-primary)]">
                                  {penalty.valueType}
                                </span>
                              </div>
                              <div className="text-sm text-[var(--color-on-surface)] opacity-70">
                                Charge: {penalty.chargeValue}
                                {penalty.taxType && (
                                  <span className="ml-2">
                                    | Tax: {penalty.taxChargeValue} (
                                    {penalty.taxType})
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedPenalty(penalty);
                                setPenaltyForm({
                                  type: penalty.type,
                                  valueType: penalty.valueType,
                                  chargeValue: penalty.chargeValue,
                                  taxType: penalty.taxType,
                                  taxChargeValue: penalty.taxChargeValue,
                                  isTaxInclusive: penalty.isTaxInclusive,
                                  taxValueType: penalty.taxValueType,
                                });
                                setUpsertPenalty(true);
                              }}
                              className="inline-flex items-center px-2 py-1 border border-[var(--color-muted)] border-opacity-50 shadow-sm text-xs font-medium rounded text-[var(--color-on-surface)] opacity-80 var(--color-background) hover:bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                            >
                              <svg
                                className="h-3 w-3 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                ></path>
                              </svg>
                              Edit
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!tenure.loanPenalty || tenure.loanPenalty.length === 0) && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-[var(--color-on-background)]">
                          Penalties
                        </h5>
                        <button
                          onClick={() => {
                            setSelectedTenure(tenure);
                            setSelectedPenalty(null);
                            setPenaltyForm({
                              type: "" as PenaltyType,
                              valueType: "" as FeeValueType,
                              chargeValue: 0,
                              taxType: "" as TaxType,
                              taxChargeValue: 0,
                              isTaxInclusive: false,
                              taxValueType: "" as FeeValueType,
                            });
                            setUpsertPenalty(true);
                          }}
                        >
                          <svg
                            className="h-3 w-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          Add New
                        </button>
                      </div>
                      <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                        No penalties configured for this tenure.
                      </p>
                    </div>
                  )}

                  {tenure.loan_charge_config &&
                    tenure.loan_charge_config.length > 0 && (
                      <div className="p-4 border-t border-[var(--color-muted)] border-opacity-30">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-semibold text-[var(--color-on-background)]">
                            Charge Configurations
                          </h5>
                          <button
                            onClick={() => {
                              setSelectedTenure(tenure);
                              setSelectedChargeConfig(null);
                              setChargeConfigForm({
                                type: "" as FeeType,
                                valueType: "" as FeeValueType,
                                isRecurringDaily: false,
                                chargeValue: 0,
                                isActive: true,
                                chargeMode: "" as ChargeMode,
                              });
                              setUpsertChargeConfig(true);
                            }}
                            className="
    inline-flex items-center gap-2
    px-3 py-1.5
    text-sm font-medium
    rounded-md
    transition-colors
    focus:outline-none
    focus:ring-2 focus:ring-[var(--color-primary)]
  "
                            style={{
                              backgroundColor: "var(--color-primary)",
                              color: "var(--color-on-primary)",
                            }}
                          >
                            <svg
                              className="h-3 w-3 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                            Add New
                          </button>
                        </div>
                        <div className="space-y-4">
                          {tenure.loan_charge_config.map((config) => (
                            <div
                              key={config.id}
                              className="p-4 border rounded-lg var(--color-background) shadow-sm"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-sm font-medium text-[var(--color-on-background)]">
                                      {config.type
                                        .replace(/_/g, " ")
                                        .toLowerCase()
                                        .replace(/\b\w/g, (l) =>
                                          l.toUpperCase()
                                        )}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-primary)] bg-opacity-15 text-[var(--color-on-primary)]">
                                      {config.valueType}
                                    </span>
                                  </div>
                                  <div className="text-sm text-[var(--color-on-surface)] opacity-70">
                                    Charge: {config.chargeValue} | Mode:{" "}
                                    {config.chargeMode}
                                  </div>
                                  <div className="text-sm text-[var(--color-on-surface)] opacity-70">
                                    Recurring Daily:{" "}
                                    {config.isRecurringDaily ? "Yes" : "No"} |{" "}
                                    Active: {config.isActive ? "Yes" : "No"}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedChargeConfig(config);
                                    setChargeConfigForm({
                                      type: config.type,
                                      valueType: config.valueType,
                                      isRecurringDaily: config.isRecurringDaily,
                                      chargeValue: config.chargeValue,
                                      isActive: config.isActive,
                                      chargeMode: config.chargeMode,
                                    });
                                    setUpsertChargeConfig(true);
                                  }}
                                  className="flex items-center px-2 py-1 border border-[var(--color-muted)] border-opacity-50 shadow-sm text-xs font-medium rounded text-[var(--color-on-surface)] opacity-80 var(--color-background) hover:bg-[var(--color-background)] transition"
                                >
                                  <svg
                                    className="h-3 w-3 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                  Edit
                                </button>
                              </div>

                              {config.loan_charge_taxes.length > 0 && (
                                <div className="mt-4 border-t pt-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h6 className="text-sm font-medium text-[var(--color-on-background)]">
                                      Charge Taxes
                                    </h6>
                                    <Button
                                      onClick={() => {
                                        setSelectedChargeTax(null);
                                        setChargeTaxForm({
                                          type: "" as TaxType,
                                          chargeValue: 0,
                                          valueType: FeeValueType.FIXED,
                                          isInclusive: false,
                                        });
                                        setSelectedChargeConfigForTax(
                                          config.id
                                        );
                                        setUpsertChargeTax(true);
                                      }}
                                      // className="inline-flex items-center px-2 py-1 border border-transparent shadow-sm text-xs font-medium rounded-md text-[var(--color-primary)]  bg-[var(--color-primary)]hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                                    >
                                      <svg
                                        className="h-3 w-3 mr-1"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
                                      </svg>
                                      Add Tax
                                    </Button>
                                  </div>
                                  <div className="space-y-3">
                                    {config.loan_charge_taxes.map((tax) => (
                                      <div
                                        key={tax.id}
                                        className="p-3 bg-[var(--color-background)] rounded-md flex justify-between items-start"
                                      >
                                        <div>
                                          <div className="flex items-center space-x-2 mb-1">
                                            <span className="text-sm font-medium text-[var(--color-on-background)]">
                                              {tax.type
                                                .replace(/_/g, " ")
                                                .toLowerCase()
                                                .replace(/\b\w/g, (l) =>
                                                  l.toUpperCase()
                                                )}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-primary)] bg-opacity-15 text-[var(--color-on-primary)]">
                                              {tax.valueType}
                                            </span>
                                          </div>
                                          <div className="text-sm text-[var(--color-on-surface)] opacity-70">
                                            Charge: {tax.chargeValue} |{" "}
                                            {tax.isInclusive
                                              ? "Inclusive"
                                              : "Exclusive"}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => {
                                            setSelectedChargeTax(tax);
                                            setChargeTaxForm({
                                              type: tax.type,
                                              chargeValue: tax.chargeValue,
                                              valueType: tax.valueType,
                                              isInclusive: tax.isInclusive,
                                            });
                                            setSelectedChargeConfigForTax(
                                              config.id
                                            );
                                            setUpsertChargeTax(true);
                                          }}
                                          className="flex items-center px-2 py-1 border border-[var(--color-muted)] border-opacity-50 shadow-sm text-xs font-medium rounded text-[var(--color-on-surface)] opacity-80 var(--color-background) hover:bg-[var(--color-background)] transition"
                                        >
                                          <svg
                                            className="h-3 w-3 mr-1"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                          </svg>
                                          Edit
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {config.loan_charge_taxes.length === 0 && (
                                <div className="mt-4 border-t pt-4">
                                  <div className="flex items-center justify-between">
                                    <h6 className="text-sm font-medium text-[var(--color-on-background)]">
                                      Charge Taxes
                                    </h6>
                                    <button
                                      onClick={() => {
                                        setSelectedChargeTax(null);
                                        setChargeTaxForm({
                                          type: "" as TaxType,
                                          chargeValue: 0,
                                          isInclusive: false,
                                          valueType: FeeValueType.FIXED,
                                        });
                                        setSelectedChargeConfigForTax(
                                          config.id
                                        );
                                        setUpsertChargeTax(true);
                                      }}
                                      className="inline-flex items-center px-2 py-1 border border-transparent shadow-sm text-xs font-medium rounded-md text-[var(--color-on-primary)]  bg-[var(--color-primary)]hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                                    >
                                      <svg
                                        className="h-3 w-3 mr-1"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
                                      </svg>
                                      Add Tax
                                    </button>
                                  </div>
                                  <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-2">
                                    No taxes configured for this charge.
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {(!tenure.loan_charge_config ||
                    tenure.loan_charge_config.length === 0) && (
                    <div className="p-4 border-t border-[var(--color-muted)] border-opacity-30">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-[var(--color-on-background)]">
                          Charge Configurations
                        </h5>
                        <button
                          onClick={() => {
                            setSelectedTenure(tenure);
                            setSelectedChargeConfig(null);
                            setChargeConfigForm({
                              type: "" as FeeType,
                              valueType: "" as FeeValueType,
                              chargeValue: 0,
                              isRecurringDaily: false,
                              isActive: true,
                              chargeMode: "" as ChargeMode,
                            });
                            setUpsertChargeConfig(true);
                          }}
                          className="inline-flex items-center gap-2
    px-3 py-1.5
    text-sm font-medium
    rounded-md
    transition-colors
    focus:outline-none
    focus:ring-2 focus:ring-[var(--color-primary)]
  "
                          style={{
                            backgroundColor: "var(--color-primary)",
                            color: "var(--color-on-primary)",
                          }}
                        >
                          <svg
                            className="h-3 w-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          Add New
                        </button>
                      </div>
                      <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                        No charge configurations set up for this tenure.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="h-12 w-12 text-[var(--color-on-surface)] opacity-50 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
                <h3 className="text-sm font-medium text-[var(--color-on-background)] mb-1">
                  No tenures available
                </h3>
                <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                  There are no loan tenures configured for this rule.
                </p>
                {/* // create tanure button */}
                <Button
                  onClick={() => {
                    setSelectedTenure(null);
                    setTenureForm({
                      loanRuleId: tenureLoanRuleId || "",
                      minTermDays: 7,
                      maxTermDays: 40, // Default to 40 days
                      minPostActiveTermDays: 0,
                      allowPrepayment: false,
                      gracePeriod: 0,
                      isActive: true,
                      loan_type: LoanTypeEnum.PAYDAY_LOAN,
                    });
                    setUpsertTenure(true);
                  }}
                  // className="mt-4 inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-xs font-medium rounded-md text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  <svg
                    className="h-3 w-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Create Tenure
                </Button>
              </div>
            </div>
          )}
        </div>
      </Sidebar>
    </div>
  );
}
