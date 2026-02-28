import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FiAlertTriangle } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import Dialog from "../../../common/dialog";
import { Button } from "../../../common/ui/button";
import { LoanRiskCategory } from "../../../constant/enum";
import { Loan, LoanRule } from "../../../shared/types/loan";
import {
  getLoanById,
  getLoanDetails,
} from "../../../shared/services/api/loan.api";
import { changeLoanRuleType } from "../../../shared/services/api/loan-rule.api";
import {
  getLoanRules,
  getTenuresByRuleId,
} from "../../../shared/services/api/settings/loanRules.setting.api";
import { useToast } from "../../../context/toastContext";

interface ChangeLoanRuleTypeProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string | null;
  onSuccess?: () => void;
}

export function ChangeLoanRuleType({
  isOpen,
  onClose,
  loanId,
  onSuccess,
}: Readonly<ChangeLoanRuleTypeProps>) {
  const { brandId } = useParams();
  const { showSuccess, showError } = useToast();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loanRules, setLoanRules] = useState<LoanRule[]>([]);
  const [ruleDetailsMap, setRuleDetailsMap] = useState<Record<string, any>>({});
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  // Manual loan ID input state
  const [manualLoanId, setManualLoanId] = useState("");
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);

  const [form, setForm] = useState({
    ruleType: "" as LoanRiskCategory | "",
    reason: "",
  });
  const [updatedRuleType, setUpdatedRuleType] = useState<LoanRiskCategory | "">(
    ""
  );

  // Common reasons for changing loan rule type
  const commonReasons = [
    "Customer profile updated",
    "Risk assessment revised",
    "Credit score improvement",
    "Credit score decline",
    "Income verification updated",
    "Employment status changed",
    "Payment history review",
    "Fraud risk assessment",
    "Collateral value change",
    "Market condition adjustment",
    "Portfolio rebalancing",
    "Customer request",
    "Regulatory compliance",
    "Administrative correction",
    "Other",
  ];

  // Check if we're in search mode
  useEffect(() => {
    if (loanId === "search") {
      // Do nothing, just keep the modal open for input
    }
  }, [loanId]);

  // Effective loan ID (manual input or parameter)
  const effectiveLoanId = manualLoanId.trim();

  // Fetch loan details and loan rules when loan ID changes
  useEffect(() => {
    const fetchData = async () => {
      if (effectiveLoanId === "") {
        setLoan(null);
        return;
      }
      if (effectiveLoanId.length <= 11) return; // Basic validation to avoid unnecessary calls
      if (!effectiveLoanId || !brandId || !isOpen) return;

      setLoading(true);
      setError("");

      try {
        // Fetch loan details
        const loanResponse = await getLoanById(brandId, effectiveLoanId);
        setLoan(loanResponse);

        // Fetch available loan rules
        const rulesResponse = await getLoanRules(brandId);
        setLoanRules(rulesResponse);

        // Fetch charge config details for each rule
        const detailsMap: Record<string, any> = {};
        for (const rule of rulesResponse) {
          try {
            const tenures = await getTenuresByRuleId(brandId, rule.id);
            detailsMap[rule.id] = tenures;
          } catch (err) {
            console.error(`Error fetching tenures for rule ${rule.id}:`, err);
            detailsMap[rule.id] = [];
          }
        }
        setRuleDetailsMap(detailsMap);

        setForm({
          ruleType: "",
          reason: "",
        });
      } catch (err) {
        const errorMsg = "Failed to fetch loan details";
        setError(errorMsg);
        setLoan(null);
        showError(errorMsg);
        console.error("Error fetching loan or rules:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [effectiveLoanId, brandId, isOpen]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatedRuleType("");

    if (!loan || !form.ruleType || !form.reason || !brandId || !loanId) {
      const validationError = "Please fill in all required fields";
      setError(validationError);
      showError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await changeLoanRuleType(brandId, loan.id, {
        ruleType: form.ruleType,
        reason: form.reason,
      });

      // Fetch updated loan details
      const updatedLoan = await getLoanDetails(brandId, loan.id);
      setLoan(updatedLoan);
      setUpdatedRuleType(form.ruleType);
      setSuccess(true);
      showSuccess("Loan rule type updated successfully!");
    } catch (err: any) {
      let errorMessage = "Failed to update loan rule type. Please try again.";

      if (err?.response?.data?.message) {
        const backendMessage = err.response.data.message;
        if (backendMessage.includes("User does not have required access")) {
          errorMessage =
            "Access denied. You don't have the required permissions. Please contact your administrator.";
        } else {
          errorMessage = backendMessage;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(""); // Clear error when user types
  };

  const handleClose = () => {
    setForm({ ruleType: "", reason: "" });
    setSelectedRuleId(null);
    setError("");
    setSuccess(false);
    setUpdatedRuleType("");
    setLoan(null);
    setManualLoanId("");
    setShowReasonDropdown(false);
    onClose();
  };

  if (!isOpen) return null;

  // Get display label for risk category
  const getRiskCategoryLabel = (category: LoanRiskCategory | "") => {
    if (!category) return "";
    const labels: Record<LoanRiskCategory, string> = {
      [LoanRiskCategory.VERY_POOR]: "Very Poor",
      [LoanRiskCategory.POOR]: "Poor",
      [LoanRiskCategory.MEDIUM]: "Medium",
      [LoanRiskCategory.HIGH]: "High",
      [LoanRiskCategory.VERY_HIGH]: "Very High",

      [LoanRiskCategory.LOW]: "Low",
      [LoanRiskCategory.MODERATE]: "Moderate",
      [LoanRiskCategory.GOOD]: "Good",
      [LoanRiskCategory.EXCELLENT]: "Excellent",
      [LoanRiskCategory.EXCEPTIONAL]: "Exceptional",

      [LoanRiskCategory.SUBPRIME]: "Subprime",
      [LoanRiskCategory.NEAR_PRIME]: "Near Prime",
      [LoanRiskCategory.PRIME]: "Prime",
      [LoanRiskCategory.SUPER_PRIME]: "Super Prime",
      [LoanRiskCategory.ULTRA_PRIME]: "Ultra Prime",
      // MIG categories hidden - uncomment if needed
      [LoanRiskCategory.MIG_CAT_1]: "",
      [LoanRiskCategory.MIG_CAT_2]: "",
      [LoanRiskCategory.MIG_CAT_3]: "",
      [LoanRiskCategory.MIG_CAT_4]: "",
      [LoanRiskCategory.MIG_CAT_5]: "",
      [LoanRiskCategory.MIG_CAT_6]: "",
      [LoanRiskCategory.MIG_CAT_7]: "",
      [LoanRiskCategory.MIG_CAT_8]: "",
      [LoanRiskCategory.MIG_CAT_9]: "",
      [LoanRiskCategory.MIG_CAT_10]: "",
      [LoanRiskCategory.MIG_CAT_11]: "",
      [LoanRiskCategory.MIG_CAT_12]: "",
      [LoanRiskCategory.MIG_CAT_13]: "",
      [LoanRiskCategory.MIG_CAT_14]: "",
      [LoanRiskCategory.MIG_CAT_15]: "",
      [LoanRiskCategory.MIG_CAT_16]: "",
      [LoanRiskCategory.MIG_CAT_17]: "",
      [LoanRiskCategory.MIG_CAT_18]: "",
      [LoanRiskCategory.MIG_CAT_19]: "",
      [LoanRiskCategory.MIG_CAT_20]: "",
      [LoanRiskCategory.MIG_CAT_21]: "",
      [LoanRiskCategory.MIG_CAT_22]: "",
      [LoanRiskCategory.MIG_CAT_23]: "",
      [LoanRiskCategory.MIG_CAT_24]: "",
      [LoanRiskCategory.MIG_CAT_25]: "",
      [LoanRiskCategory.MIG_CAT_26]: "",
      [LoanRiskCategory.MIG_CAT_27]: "",
      [LoanRiskCategory.MIG_CAT_28]: "",
      [LoanRiskCategory.MIG_CAT_29]: "",
      [LoanRiskCategory.MIG_CAT_30]: "",
      [LoanRiskCategory.MIG_CAT_31]: "",
      [LoanRiskCategory.MIG_CAT_32]: "",
      [LoanRiskCategory.MIG_CAT_33]: "",
      [LoanRiskCategory.MIG_CAT_34]: "",
      [LoanRiskCategory.MIG_CAT_35]: "",
      [LoanRiskCategory.MIG_CAT_36]: "",
      [LoanRiskCategory.MIG_CAT_37]: "",
      [LoanRiskCategory.MIG_CAT_38]: "",
      [LoanRiskCategory.MIG_CAT_39]: "",
      [LoanRiskCategory.MIG_CAT_40]: "",
      [LoanRiskCategory.MIG_CAT_41]: "",
      [LoanRiskCategory.MIG_CAT_42]: "",
      [LoanRiskCategory.MIG_CAT_43]: "",
      [LoanRiskCategory.MIG_CAT_44]: "",
      [LoanRiskCategory.MIG_CAT_45]: "",
      [LoanRiskCategory.MIG_CAT_46]: "",
      [LoanRiskCategory.MIG_CAT_47]: "",
      [LoanRiskCategory.MIG_CAT_48]: "",
      [LoanRiskCategory.MIG_CAT_49]: "",
      [LoanRiskCategory.MIG_CAT_50]: "",
    };
    return labels[category];
  };

  // Get formatted charge config display
  const formatChargeConfig = (
    _chargeType: string,
    value: number,
    valueType: string
  ): string => {
    if (valueType === "percentage" || valueType === "PERCENTAGE") {
      return `${value}%`;
    }
    return `₹${value.toLocaleString("en-IN")}`;
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Update Loan Rule Type">
      <div className="space-y-6">
        {/* Manual Loan ID Input */}
        <div>
          <label
            htmlFor="manualLoanId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Enter Formatted Loan ID <span className="text-red-500">*</span>
          </label>
          <input
            id="manualLoanId"
            type="text"
            value={manualLoanId}
            onChange={(e) => setManualLoanId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. LOAN123456"
            disabled={loading || submitting}
          />
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <CgSpinner className="animate-spin text-2xl text-blue-600" />
            <span className="ml-2 text-gray-600">Loading loan details...</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Success Header */}
            <div className="flex items-center gap-3  bg-green-50 pb-2">
              <div className="flex-shrink-0">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-green-900">
                  Update Successful!
                </h3>
                <p className="text-sm text-green-800">
                  Loan rule type has been updated successfully.
                </p>
              </div>
            </div>

            {/* Updated Loan Details */}
            {loan && (
              <div className="space-y-3">
                {/* Main Loan Info Card */}
                <div className="bg-white border border-green-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                      </svg>
                    </div>
                    Loan Information
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="border-l-2 border-green-400 pl-3">
                      <p className="text-gray-600 text-xs font-medium">
                        Loan ID
                      </p>
                      <p className="text-gray-900 font-mono">
                        {loan.formattedLoanId}
                      </p>
                    </div>
                    <div className="border-l-2 border-green-400 pl-3">
                      <p className="text-gray-600 text-xs font-medium">
                        Customer Name
                      </p>
                      <p className="text-gray-900">
                        {[
                          loan.user?.userDetails?.firstName,
                          loan.user?.userDetails?.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ") || "N/A"}
                      </p>
                    </div>
                    <div className="border-l-2 border-green-400 pl-3">
                      <p className="text-gray-600 text-xs font-medium">
                        Loan Amount
                      </p>
                      <p className="text-gray-900 font-semibold">
                        ₹{loan.amount?.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="border-l-2 border-green-400 pl-3">
                      <p className="text-gray-600 text-xs font-medium">
                        New Rule Type
                      </p>
                      <p className="text-green-700 font-semibold">
                        {getRiskCategoryLabel(updatedRuleType)}
                      </p>
                    </div>
                    <div className="border-l-2 border-green-400 pl-3">
                      <p className="text-gray-600 text-xs font-medium">
                        Status
                      </p>
                      <p className="text-gray-900">{loan.status}</p>
                    </div>
                    <div className="border-l-2 border-green-400 pl-3">
                      <p className="text-gray-600 text-xs font-medium">
                        Loan Purpose
                      </p>
                      <p className="text-gray-900 text-xs">
                        {loan.purpose || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Loan Details Card */}
                {loan.loanDetails && (
                  <div className="bg-white border border-green-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      Additional Details
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {loan.loanDetails.dueDate && (
                        <div className="border-l-2 border-green-400 pl-3">
                          <p className="text-gray-600 text-xs font-medium">
                            Due Date
                          </p>
                          <p className="text-gray-900">
                            {new Date(
                              loan.loanDetails.dueDate
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {loan.applicationDate && (
                        <div className="border-l-2 border-green-400 pl-3">
                          <p className="text-gray-600 text-xs font-medium">
                            Applied On
                          </p>
                          <p className="text-gray-900">
                            {new Date(
                              loan.applicationDate
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {loan.approvalDate && (
                        <div className="border-l-2 border-green-400 pl-3">
                          <p className="text-gray-600 text-xs font-medium">
                            Approved On
                          </p>
                          <p className="text-gray-900">
                            {new Date(loan.approvalDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Agreement Status Card */}
                {loan.agreement && (
                  <div className="bg-white border border-green-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path
                            fillRule="evenodd"
                            d="M4 5a2 2 0 012-2 1 1 0 000-2H6a6 6 0 100 12H6a1 1 0 000 2 2 2 0 002 2h8a2 2 0 002-2V9a6 6 0 10-12 0v6a2 2 0 002 2h2a1 1 0 100-2h-2a2 2 0 01-2-2V5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      Agreement Status
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="border-l-2 border-green-400 pl-3">
                        <p className="text-gray-600 text-xs font-medium">
                          Status
                        </p>
                        <p className="text-gray-900 font-semibold">
                          {loan.agreement.status}
                        </p>
                      </div>
                      <div className="border-l-2 border-green-400 pl-3">
                        <p className="text-gray-600 text-xs font-medium">
                          Signed
                        </p>
                        <p
                          className={`font-semibold ${
                            loan.agreement.signedByUser
                              ? "text-green-700"
                              : "text-gray-900"
                          }`}
                        >
                          {loan.agreement.signedByUser ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Repayment Details */}
                {loan.repayment && (
                  <div className="bg-white border border-green-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M8.433 7.418c.155.03.299.076.438.114a.773.773 0 00.178-.061.75.75 0 00.1-1.405A2.001 2.001 0 0010 4.5a2 2 0 00-2 2c0 .341.068.668.195.978a.75.75 0 00.422.405c.14.038.282.084.437.114a.852.852 0 01.178.061.75.75 0 00.1 1.405A2.001 2.001 0 0010 15.5a2 2 0 002-2c0-.341-.068-.668-.195-.978a.75.75 0 00-.422-.405A3.026 3.026 0 009.563 12.062.852.852 0 019.385 12a.75.75 0 00-.1-1.405zM15 9.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm.75-6.75a.75.75 0 100-1.5.75.75 0 000 1.5zm-.75 9a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM6.75 9.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm.75-9a.75.75 0 100-1.5.75.75 0 000 1.5zm-.75 9a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                        </svg>
                      </div>
                      Repayment Details
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-gray-600 text-xs font-medium">
                          Total Obligation
                        </p>
                        <p className="text-green-700 font-semibold">
                          ₹
                          {loan.repayment.totalObligation?.toLocaleString(
                            "en-IN"
                          ) || "0"}
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-gray-600 text-xs font-medium">
                          Total Fees
                        </p>
                        <p className="text-green-700 font-semibold">
                          ₹
                          {loan.repayment.totalFees?.toLocaleString("en-IN") ||
                            "0"}
                        </p>
                      </div>
                    </div>

                    {loan.repayment.feeBreakdowns &&
                      loan.repayment.feeBreakdowns.length > 0 && (
                        <div className="space-y-2 mt-2">
                          <p className="text-xs font-medium text-gray-600">
                            Fee Breakdown:
                          </p>
                          {loan.repayment.feeBreakdowns.map((fee: any) => (
                            <div
                              key={fee.id}
                              className="bg-gray-50 rounded p-2 text-xs border border-gray-200"
                            >
                              <div className="flex justify-between mb-1">
                                <span className="font-medium text-gray-700">
                                  {fee.type}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  ₹{fee.total?.toLocaleString("en-IN") || "0"}
                                </span>
                              </div>
                              {fee.taxes && fee.taxes.length > 0 && (
                                <div className="ml-2 text-gray-600">
                                  {fee.taxes.map((tax: any) => (
                                    <div
                                      key={tax.id}
                                      className="flex justify-between text-xs opacity-70"
                                    >
                                      <span>{tax.type}</span>
                                      <span>
                                        ₹
                                        {tax.amount?.toLocaleString("en-IN") ||
                                          "0"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                )}

                {/* Disbursement Details */}
                {loan.disbursement && (
                  <div className="bg-white border border-green-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                      </div>
                      Disbursement Details
                    </h4>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-gray-600 text-xs font-medium">
                          Gross Amount
                        </p>
                        <p className="text-green-700 font-semibold text-sm">
                          ₹
                          {loan.disbursement.grossAmount?.toLocaleString(
                            "en-IN"
                          ) || "0"}
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-gray-600 text-xs font-medium">
                          Net Amount
                        </p>
                        <p className="text-blue-700 font-semibold text-sm">
                          ₹
                          {loan.disbursement.netAmount?.toLocaleString(
                            "en-IN"
                          ) || "0"}
                        </p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <p className="text-gray-600 text-xs font-medium">
                          Deductions
                        </p>
                        <p className="text-red-700 font-semibold text-sm">
                          ₹
                          {loan.disbursement.totalDeductions?.toLocaleString(
                            "en-IN"
                          ) || "0"}
                        </p>
                      </div>
                    </div>

                    {loan.disbursement.deductions &&
                      loan.disbursement.deductions.length > 0 && (
                        <div className="space-y-2 mt-2">
                          <p className="text-xs font-medium text-gray-600">
                            Deductions Breakdown:
                          </p>
                          {loan.disbursement.deductions.map(
                            (deduction: any) => (
                              <div
                                key={deduction.id}
                                className="bg-gray-50 rounded p-2 text-xs border border-gray-200"
                              >
                                <div className="flex justify-between mb-1">
                                  <span className="font-medium text-gray-700">
                                    {deduction.type}
                                  </span>
                                  <span className="font-semibold text-red-700">
                                    -₹
                                    {deduction.total?.toLocaleString("en-IN") ||
                                      "0"}
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                  </div>
                )}

                {/* Early Repayment & Penalties */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {loan.earlyRepayment && (
                    <div className="bg-white border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00-.293.707l-.707.707a1 1 0 101.414 1.414L9 9.414V6z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        Early Repayment
                      </h4>
                      <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                        <p className="text-xs text-gray-600 mb-1">
                          Daily Savings
                        </p>
                        <p className="text-lg font-bold text-green-700">
                          ₹
                          {loan.earlyRepayment.totalAmount?.toLocaleString(
                            "en-IN"
                          ) || "0"}
                          /day
                        </p>
                      </div>
                    </div>
                  )}

                  {loan.penalties && loan.penalties.length > 0 && (
                    <div className="bg-white border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v2h8v-2zM2 15a4 4 0 008 0v2H2v-2z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        Penalty Details
                      </h4>
                      <div className="space-y-2">
                        {loan.penalties.map((penalty: any) => (
                          <div
                            key={penalty.id}
                            className="bg-red-50 border border-red-200 rounded p-2 text-xs"
                          >
                            <div className="flex justify-between mb-1">
                              <span className="font-medium text-red-700">
                                {penalty.type}
                              </span>
                              <span className="font-semibold text-red-900">
                                {penalty.chargeValue}
                                {penalty.valueType === "percentage" ||
                                penalty.valueType === "PERCENTAGE"
                                  ? "%"
                                  : ""}
                              </span>
                            </div>
                            {penalty.taxType && (
                              <p className="text-gray-600">
                                Tax: {penalty.taxType} ({penalty.taxChargeValue}
                                %)
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Evaluation Results */}
                {/* {loan.evaluations && loan.evaluations.length > 0 && (
                  <div className="bg-white border border-green-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6.267 3.455a3 3 0 001.946 0l2.468 1.734c.435.305.435.905 0 1.21l-2.468 1.734a3 3 0 01-1.946 0L3.799 6.399c-.435-.305-.435-.905 0-1.21l2.468-1.734zm0 4.697a3 3 0 001.946 0l2.468 1.734c.435.305.435.905 0 1.21l-2.468 1.734a3 3 0 01-1.946 0l-2.468-1.734c-.435-.305-.435-.905 0-1.21l2.468-1.734zm0 4.697a3 3 0 001.946 0l2.468 1.734c.435.305.435.905 0 1.21l-2.468 1.734a3 3 0 01-1.946 0l-2.468-1.734c-.435-.305-.435-.905 0-1.21l2.468-1.734z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      Evaluation Results
                    </h4>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {loan.evaluations.map((evalItem: any) => (
                        <div key={evalItem.id} className="space-y-1">
                          {evalItem.evaluation_item?.map((item: any) => (
                            <div
                              key={item.id}
                              className={`p-2 rounded border-l-2 text-xs ${
                                item.status === "ELIGIBLE"
                                  ? "bg-green-50 border-green-400"
                                  : "bg-red-50 border-red-400"
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-gray-900">
                                  {item.parameter}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    item.status === "ELIGIBLE"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </div>
                              <div className="text-gray-600 grid grid-cols-2 gap-1 text-xs">
                                <p>
                                  <span className="font-medium">Required:</span>{" "}
                                  {item.requiredValue}
                                </p>
                                <p>
                                  <span className="font-medium">Actual:</span>{" "}
                                  {item.actualValue}
                                </p>
                                <p>
                                  <span className="font-medium">Source:</span>{" "}
                                  {item.source}
                                </p>
                                {item.comments && (
                                  <p>
                                    <span className="font-medium">
                                      Comments:
                                    </span>{" "}
                                    {item.comments}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )} */}

                {/* Reason for Change Card */}
                <div className="bg-white border border-green-200 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    Reason for Change
                  </h4>
                  <p className="text-gray-700 text-sm bg-green-50 p-3 rounded border border-green-200">
                    {form.reason}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-green-200 sticky bottom-0 bg-green-50 pb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSuccess(false);
                  setUpdatedRuleType("");
                  setForm({ ruleType: "", reason: "" });
                  setManualLoanId("");
                  onSuccess?.();
                }}
              >
                Finish & Close
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setSuccess(false);
                  setUpdatedRuleType("");
                  setForm({ ruleType: "", reason: "" });
                }}
              >
                Update Another Loan
              </Button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
            <FiAlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loan Details & Form */}
        {loan && !loading && !success && (
          <>
            {/* Current Loan Info */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Loan Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Loan ID:</span>
                  <span className="ml-2 font-mono">{loan.formattedLoanId}</span>
                </div>
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <span className="ml-2 font-semibold">
                    ₹{loan.amount?.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Customer:</span>
                  <span className="ml-2">
                    {[
                      loan.user?.userDetails?.firstName,
                      loan.user?.userDetails?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {loan.status}
                  </span>
                </div>
              </div>

              {/* Agreement Status Info */}
              <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                <div>
                  <span className="text-gray-600">Agreement Status:</span>
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                    {loan.agreement?.status || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Validation Warning for Agreement Status */}
            {loan.agreement && loan.agreement.status !== "NOT_SENT" && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg flex items-start gap-2">
                <FiAlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>
                  The loan rule type can only be updated when the agreement
                  status is "NOT_SENT". Current status is "
                  {loan.agreement.status}". Please reset the agreement status
                  first.
                </span>
              </div>
            )}

            {/* Validation Warning for Loan Status */}
            {loan.status !== "PENDING" &&
              loan.status !== "CREDIT_EXECUTIVE_APPROVED" && (
                <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg flex items-start gap-2">
                  <FiAlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>
                    The loan rule type can only be updated when the loan status
                    is "PENDING" or "CREDIT_EXECUTIVE_APPROVED". Current status
                    is "{loan.status}".
                  </span>
                </div>
              )}

            {/* Update Form */}
            <form
              onSubmit={handleSubmit}
              className={`space-y-4 ${
                (loan.agreement && loan.agreement.status !== "NOT_SENT") ||
                (loan.status !== "PENDING" &&
                  loan.status !== "CREDIT_EXECUTIVE_APPROVED")
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
            >
              {/* Rule Type Select */}
              <div>
                <label
                  htmlFor="ruleType"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  New Rule Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="ruleType"
                  name="ruleType"
                  value={form.ruleType}
                  onChange={(e) => {
                    handleChange(e);
                    if (e.target.value) {
                      // Find the corresponding rule ID for this ruleType
                      const selectedRule = loanRules.find(
                        (r) => r.ruleType === e.target.value
                      );
                      if (selectedRule) {
                        setSelectedRuleId(selectedRule.id);
                      }
                    } else {
                      setSelectedRuleId(null);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">-- Select Rule Type --</option>
                  {loanRules
                    .filter((rule) => getRiskCategoryLabel(rule.ruleType))
                    .map((rule) => {
                      // Extract processing fee and interest from the first tenure's charge config
                      let processingFee = "0%";
                      let interestRate = "0%";
                      
                      const tenures = ruleDetailsMap[rule.id];
                      if (tenures && tenures.length > 0) {
                        const firstTenure = tenures[0];
                        if (firstTenure.loan_charge_config && firstTenure.loan_charge_config.length > 0) {
                          const processingConfig = firstTenure.loan_charge_config.find(
                            (config: any) => config.type === "processing"
                          );
                          const interestConfig = firstTenure.loan_charge_config.find(
                            (config: any) => config.type === "interest"
                          );
                          
                          if (processingConfig) {
                            processingFee = `${processingConfig.chargeValue}%`;
                          }
                          if (interestConfig) {
                            interestRate = `${interestConfig.chargeValue}%`;
                          }
                        }
                      }
                      
                      return (
                        <option key={rule.id} value={rule.ruleType}>
                          {getRiskCategoryLabel(rule.ruleType)} | Processing Fees: {processingFee} | Interest: {interestRate}
                        </option>
                      );
                    })}
                </select>

                {/* Show charge config details for selected rule */}
                {form.ruleType &&
                  selectedRuleId &&
                  ruleDetailsMap[selectedRuleId] && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Loan Charge Configuration
                      </h4>
                      <div className="space-y-2 text-xs">
                        {ruleDetailsMap[selectedRuleId].length > 0 ? (
                          ruleDetailsMap[selectedRuleId].map((tenure: any) => (
                            <div
                              key={tenure.id}
                              className="border-l-2 border-blue-300 pl-3"
                            >
                              {/* Tenure Info */}
                              <div className="font-medium text-gray-700 mb-2">
                                Tenure: {tenure.minTermDays} -{" "}
                                {tenure.maxTermDays} days
                              </div>

                              {/* Charge Configs */}
                              {tenure.loan_charge_config &&
                                tenure.loan_charge_config.length > 0 && (
                                  <div className="space-y-1">
                                    {tenure.loan_charge_config.map(
                                      (config: any) => (
                                        <div
                                          key={config.id}
                                          className="bg-white p-2 rounded border border-gray-200"
                                        >
                                          <div className="flex justify-between items-start">
                                            <span className="text-gray-600">
                                              {config.type}:
                                            </span>
                                            <span className="font-semibold text-gray-900">
                                              {formatChargeConfig(
                                                config.type,
                                                config.chargeValue,
                                                config.valueType
                                              )}
                                            </span>
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1">
                                            Mode: {config.chargeMode}
                                            {config.isRecurringDaily && (
                                              <span className="ml-2 inline-block px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                                                Daily Recurring
                                              </span>
                                            )}
                                          </div>

                                          {/* Tax Info */}
                                          {config.loan_charge_taxes &&
                                            config.loan_charge_taxes.length >
                                              0 && (
                                              <div className="mt-1 pt-1 border-t border-gray-100">
                                                <span className="text-gray-500">
                                                  Tax:
                                                </span>
                                                {config.loan_charge_taxes.map(
                                                  (tax: any) => (
                                                    <div
                                                      key={tax.id}
                                                      className="text-gray-600 ml-2"
                                                    >
                                                      {tax.type}:{" "}
                                                      {tax.chargeValue}%
                                                      {tax.isInclusive && (
                                                        <span className="text-xs text-gray-500">
                                                          {" "}
                                                          (Inclusive)
                                                        </span>
                                                      )}
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}

                              {/* Penalties */}
                              {tenure.loanPenalty &&
                                tenure.loanPenalty.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <span className="text-gray-600 font-medium">
                                      Penalties:
                                    </span>
                                    <div className="space-y-1">
                                      {tenure.loanPenalty.map(
                                        (penalty: any) => (
                                          <div
                                            key={penalty.id}
                                            className="text-gray-600 ml-2"
                                          >
                                            {penalty.type}:{" "}
                                            {formatChargeConfig(
                                              penalty.type,
                                              penalty.chargeValue,
                                              penalty.valueType
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 italic">
                            No charge configurations available for this rule.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Reason */}
              <div>
                <label
                  htmlFor="reason"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Reason for Change <span className="text-red-500">*</span>
                </label>
                <div className="relative mb-2">
                  <button
                    type="button"
                    onClick={() => setShowReasonDropdown(!showReasonDropdown)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <span
                      className={
                        form.reason ? "text-gray-900" : "text-gray-500"
                      }
                    >
                      {form.reason || "Select a common reason..."}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        showReasonDropdown ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showReasonDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {commonReasons.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, reason }));
                            setShowReasonDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                            form.reason === reason
                              ? "bg-blue-50 text-blue-900 font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{reason}</span>
                            {form.reason === reason && (
                              <svg
                                className="w-5 h-5 text-blue-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Textarea for custom reason */}
                <textarea
                  id="reason"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Select from dropdown above or type a custom reason..."
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || !form.ruleType || !form.reason}
                  className="min-w-[120px]"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <CgSpinner className="animate-spin" />
                      Updating...
                    </div>
                  ) : (
                    "Update Rule Type"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </Dialog>
  );
}
