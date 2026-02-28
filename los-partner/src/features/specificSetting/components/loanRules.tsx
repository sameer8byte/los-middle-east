import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LoanRule } from "../../../shared/types/loan";
import { getLoanRules } from "../../../shared/services/api/settings/loanRules.setting.api";
 
export const LoanRiskCategoryEnum = {
  very_poor: "very_poor",
  poor: "poor",
  medium: "medium",
  high: "high",
  very_high: "very_high",

   low: "low",
  moderate: "moderate",
  good: "good",
  excellent: "excellent",
  exceptional: "exceptional",

  subprime: "subprime",
  near_prime: "near_prime",
  prime: "prime",
  super_prime: "super_prime",
  ultra_prime: "ultra_prime",
  
  mig_cat_1: "mig_cat_1",
  mig_cat_2: "mig_cat_2",
  mig_cat_3: "mig_cat_3",
  mig_cat_4: "mig_cat_4",
  mig_cat_5: "mig_cat_5",
  mig_cat_6: "mig_cat_6",
  mig_cat_7: "mig_cat_7",
  mig_cat_8: "mig_cat_8",
  mig_cat_9: "mig_cat_9",
  mig_cat_10: "mig_cat_10",
  mig_cat_11: "mig_cat_11",
  mig_cat_12: "mig_cat_12",
  mig_cat_13: "mig_cat_13",
  mig_cat_14: "mig_cat_14",
  mig_cat_15: "mig_cat_15",
  mig_cat_16: "mig_cat_16",
  mig_cat_17: "mig_cat_17",
  mig_cat_18: "mig_cat_18",
  mig_cat_19: "mig_cat_19",
  mig_cat_20: "mig_cat_20",
  mig_cat_21: "mig_cat_21",
  mig_cat_22: "mig_cat_22",
  mig_cat_23: "mig_cat_23",
  mig_cat_24: "mig_cat_24",
  mig_cat_25: "mig_cat_25",
  mig_cat_26: "mig_cat_26",
  mig_cat_27: "mig_cat_27",
  mig_cat_28: "mig_cat_28",
  mig_cat_29: "mig_cat_29",
  mig_cat_30: "mig_cat_30",
  mig_cat_31: "mig_cat_31",
  mig_cat_32: "mig_cat_32",
  mig_cat_33: "mig_cat_33",
  mig_cat_34: "mig_cat_34",
  mig_cat_35: "mig_cat_35",
  mig_cat_36: "mig_cat_36",
  mig_cat_37: "mig_cat_37",
  mig_cat_38: "mig_cat_38",
  mig_cat_39: "mig_cat_39",
  mig_cat_40: "mig_cat_40",
  mig_cat_41: "mig_cat_41",
  mig_cat_42: "mig_cat_42",
  mig_cat_43: "mig_cat_43",
  mig_cat_44: "mig_cat_44",
  mig_cat_45: "mig_cat_45",
  mig_cat_46: "mig_cat_46",
  mig_cat_47: "mig_cat_47",
  mig_cat_48: "mig_cat_48",
  mig_cat_49: "mig_cat_49",
  mig_cat_50: "mig_cat_50",
} as const;

export type LoanRiskCategory = keyof typeof LoanRiskCategoryEnum;

 

export function LoanRules() {
  const { brandId } = useParams<{ brandId: string }>();
  const [rules, setRules] = useState<LoanRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) {
      setError("Brand ID is not provided");
      setLoading(false);
      return;
    }

    const fetchRules = async () => {
      try {
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

  if (loading) {
    return <div className="p-8 text-[var(--color-on-surface)] opacity-70">Loading loan rules...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-8 bg-white rounded-xl shadow-lg border border-[var(--color-muted)] border-opacity-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-on-background)] mb-2">Loan Rules</h1>
        <p className="text-sm text-[var(--color-on-surface)] opacity-70">Configured risk parameters</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-muted)] border-opacity-30">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[var(--color-background)]">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider"
              >
                Risk Category
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider"
              >
                Min Amount
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider"
              >
                Max Amount
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider"
              >
                Tenures
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider"
              >
                Penalty
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rules.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-[var(--color-on-surface)] opacity-70">
                  No loan rules found
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="hover:bg-[var(--color-background)] transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {rule.ruleType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        rule.isActive
                          ? "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)]"
                          : "bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)]"
                      }`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ${rule.minAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ${rule.maxAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-primary hover:text-primary-hover">
                      View Tenures
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-primary hover:text-primary-hover">
                      View Penalty
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-primary hover:text-primary-hover">
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
