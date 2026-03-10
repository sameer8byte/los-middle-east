import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Spinner } from "../../../../common/ui/spinner";
import { Button } from "../../../../common/ui/button";
import {
  FaSpinner,
  FaCheck,
  FaTimes,
  FaClock,
  FaLock,
  // FaExclamationTriangle,
  FaBolt,
} from "react-icons/fa";
import {
  EvaluationV2,
  upsertEvaluateByLoanId,
  getEvaluationByLoanId,
  updateEvaluationV2Item,
} from "../../../../shared/services/api/evaluationV2.api";
import {
  updateLoan,
  updateLoanWithReasons,
} from "../../../../shared/services/api/loan.api";
import { LoanStatusEnum } from "../../../../constant/enum";
import dayjs from "dayjs";
import { ConfirmationDialog } from "./confirmationDialog";
import Sidebar from "../../../../common/sidebar";
import debounce from "lodash.debounce";
import { Loan } from "../../../../shared/types/loan";
import { useAppSelector } from "../../../../shared/redux/store";
import { Conversion } from "../../../../utils/conversion";

// --- TYPE DEFINITIONS (Unchanged) ---
interface EvaluationV2ComponentProps {
  loanId: string;
  userId: string;
  setLoanId: (id: string | null) => void;
  loan: Loan | null; // Add loan data prop
  onLoanStatusUpdate?: (updatedLoan: any) => void;
}

// --- STAGE DESCRIPTIONS (Centralized for cleaner usage) ---
const stageDescriptions: Record<"ONE" | "TWO" | "THREE" | "FOUR", string> = {
  ONE: "Basic Filter Check",
  TWO: "Employment & Bank Verification",
  THREE: "Credit Bureau Check",
  FOUR: "Proprietary Verification",
};

// Define the debounced function type with cancel method
type DebouncedFunction = {
  (comments: string): void;
  cancel: () => void;
};

// --- COMPONENT START ---

export function EvaluationV2Component({
  loanId,
  setLoanId,
  loan,
  onLoanStatusUpdate,
}: EvaluationV2ComponentProps) {
  const { brandId, customerId: userId } = useParams<{
    brandId: string;
    customerId: string;
  }>();
  const brandConfig = useAppSelector((state) => state.brand.brandConfig);
  const brandCamCalculationRequired =
    brandConfig?.is_cam_calculation_required || false;
  const [evaluation, setEvaluation] = useState<EvaluationV2 | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Record<string, boolean>>(
    {}
  );
  const [selectedStage, setSelectedStage] = useState<
    "ALL" | "ONE" | "TWO" | "THREE" | "FOUR"
  >("ALL");
  const [statusFilter] = useState<
    "ALL" | "ELIGIBLE" | "NOT_ELIGIBLE" | "OVERRIDDEN"
  >("ALL");
  const [pendingComments, setPendingComments] = useState<
    Record<string, string>
  >({});
  const [savingComments, setSavingComments] = useState<Record<string, boolean>>(
    {}
  );

  // Approve/Reject states
  const [showConfirm, setShowConfirm] = useState<"approve" | "reject" | null>(
    null
  );
  const [isLoanLoading, setIsLoanLoading] = useState(false);
  const [approvedLoanAmount, setApprovedLoanAmount] = useState<number | null>(
    loan?.amount || null
  );
  const [approvedDueDate, setApprovedDueDate] = useState<string | null>(
    dayjs(loan?.loanDetails?.dueDate).format("YYYY-MM-DD") || null
  );
  const [selectedRejectionReasons, setSelectedRejectionReasons] = useState<
    string[]
  >([]);
  const [popupError, setPopupError] = useState<string | null>(null);
  const [currentLoanStatus, setCurrentLoanStatus] =
    useState<LoanStatusEnum | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectionReasonsValid, setRejectionReasonsValid] = useState(false);

  // Debounced comment save functions
  const debouncedSaveComments = useRef<Record<string, DebouncedFunction>>({});

  // Initialize debounced functions for each item
  useEffect(() => {
    if (evaluation) {
      evaluation.evaluation_item.forEach((item) => {
        if (!debouncedSaveComments.current[item.id]) {
          const debouncedFunc = debounce(
            async (comments: string) => {
              await handleAutoSaveComments(item.id, comments);
            },
            1000 // 1 second delay
          ) as DebouncedFunction;

          debouncedSaveComments.current[item.id] = debouncedFunc;
        }
      });
    }
  }, [evaluation]);

  // Cleanup debounced functions on unmount
  useEffect(() => {
    return () => {
      Object.values(debouncedSaveComments.current).forEach((debouncedFunc) => {
        debouncedFunc.cancel();
      });
    };
  }, []);

  // --- LOGIC FUNCTIONS ---
  useEffect(() => {
    if (loanId && userId && brandId) {
      initializeEvaluation();
    }
  }, [loanId, userId, brandId]);

  useEffect(() => {
    if (loan?.status) {
      setCurrentLoanStatus(loan.status);
    } else {
      setCurrentLoanStatus(LoanStatusEnum.PENDING);
    }
  }, [loan]);

  useEffect(() => {
    if (
      evaluation &&
      selectedStage !== "ALL" &&
      !isStageUnlocked(selectedStage)
    ) {
      setSelectedStage("ALL");
    }
  }, [evaluation, selectedStage]);

  const initializeEvaluation = async () => {
    if (!brandId) return;
    if (!userId) return;

    setLoading(true);
    try {
      let evaluationData: EvaluationV2;
      try {
        evaluationData = await getEvaluationByLoanId(userId, brandId, loanId);
      } catch (error) {
        evaluationData = await upsertEvaluateByLoanId(userId, brandId, loanId);
      }

      setEvaluation(evaluationData);
    } catch (error) {
      console.error("Error initializing evaluation:", error);
      // toast.error("❌ Failed to load evaluation data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (
    itemId: string,
    updates: {
      actualValue?: string;
      status?: "ELIGIBLE" | "NOT_ELIGIBLE";
      override?: boolean;
      comments?: string;
    }
  ) => {
    if (!evaluation || !brandId) return;

    setUpdatingItems((prev) => ({ ...prev, [itemId]: true }));

    try {
      const updatedItem = await updateEvaluationV2Item(
        brandId,
        evaluation.id,
        itemId,
        updates
      );

      setEvaluation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          evaluation_item: prev.evaluation_item.map((item) =>
            item.id === itemId ? { ...item, ...updatedItem } : item
          ),
        };
      });

      // toast.success("✅ Evaluation item updated successfully");
    } catch (error) {
      console.error("Error updating evaluation item:", error);
      toast.error("❌ Failed to update evaluation item");
    } finally {
      setUpdatingItems((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleStatusChange = (
    itemId: string,
    status: "ELIGIBLE" | "NOT_ELIGIBLE"
  ) => {
    const item = evaluation?.evaluation_item.find((i) => i.id === itemId);
    if (!item) return;
    const isOverride = true; // Manual status change implies override
    handleUpdateItem(itemId, { status, override: isOverride });
  };

  const handleActualValueChange = (itemId: string, actualValue: string) => {
    handleUpdateItem(itemId, { actualValue });
  };

  const handleCommentsChange = (itemId: string, comments: string) => {
    // Update UI immediately
    setPendingComments((prev) => ({ ...prev, [itemId]: comments }));

    // Trigger debounced save
    if (debouncedSaveComments.current[itemId]) {
      debouncedSaveComments.current[itemId](comments);
    }
  };

  const handleAutoSaveComments = async (itemId: string, comments: string) => {
    if (!evaluation || !brandId || !comments.trim()) return;

    setSavingComments((prev) => ({ ...prev, [itemId]: true }));

    try {
      await handleUpdateItem(itemId, { comments });

      // Clear from pending comments after successful save
      setPendingComments((prev) => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });

      // Optional: Show subtle success feedback
      // toast.success("💬 Comment saved", { autoClose: 1000 });
    } catch (error) {
      console.error("Error auto-saving comment:", error);
      toast.error("❌ Failed to save comment");
    } finally {
      setSavingComments((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const getFilteredItems = () => {
    if (!evaluation) return [];

    if (selectedStage !== "ALL" && !isStageUnlocked(selectedStage)) {
      return [];
    }

    return evaluation.evaluation_item.filter((item) => {
      // Stage filter
      const stageMatch =
        selectedStage === "ALL" || item.stage === selectedStage;

      // Status filter
      let statusMatch = true;
      if (statusFilter === "ELIGIBLE") {
        statusMatch = item.status === "ELIGIBLE";
      } else if (statusFilter === "NOT_ELIGIBLE") {
        statusMatch = item.status === "NOT_ELIGIBLE";
      } else if (statusFilter === "OVERRIDDEN") {
        statusMatch = item.override;
      }

      return stageMatch && statusMatch;
    });
  };

  const getStages = () => {
    if (!evaluation) return [];
    const stages = Array.from(
      new Set(evaluation.evaluation_item.map((item) => item.stage))
    );
    // Sort stages numerically: ONE, TWO, THREE, FOUR
    return stages.sort((a, b) => {
      const order = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4 };
      return (
        (order[a as keyof typeof order] || 0) -
        (order[b as keyof typeof order] || 0)
      );
    });
  };

  const isStageUnlocked = (
    targetStage: string | "ALL" | "ONE" | "TWO" | "THREE" | "FOUR"
  ) => {
    if (!evaluation || targetStage === "ALL") return true;

    const stages = getStages();
    const targetIndex = stages.findIndex((s) => s === targetStage);

    if (targetIndex === -1) return true;

    for (let i = 0; i < targetIndex; i++) {
      const stage = stages[i];
      const stageItems = evaluation.evaluation_item.filter(
        (item) => item.stage === stage
      );

      const allEligible = stageItems.every(
        (item) => item.status === "ELIGIBLE"
      );

      if (!allEligible) {
        return false;
      }
    }

    return true;
  };

  const getStageLockedReason = (
    targetStage: string | "ALL" | "ONE" | "TWO" | "THREE" | "FOUR"
  ) => {
    if (!evaluation || targetStage === "ALL") return null;

    const stages = getStages();
    const targetIndex = stages.findIndex((s) => s === targetStage);

    if (targetIndex === -1) return null;

    for (let i = 0; i < targetIndex; i++) {
      const stage = stages[i];
      const stageItems = evaluation.evaluation_item.filter(
        (item) => item.stage === stage
      );

      const allEligible = stageItems.every(
        (item) => item.status === "ELIGIBLE" || item.override
      );

      if (!allEligible) {
        const ineligibleCount = stageItems.filter(
          (item) => item.status !== "ELIGIBLE"
        ).length;
        return `Complete Stage ${stage} first (${ineligibleCount} items need attention)`;
      }
    }

    return null;
  };

  const handleReject = async (loanId: string) => {
    if (!loanId || !brandId) return;
    setIsLoanLoading(true);
    try {
      await updateLoanWithReasons(loanId, brandId, {
        loanId,
        status: LoanStatusEnum.REJECTED,
        reason: notes,
        brandStatusReasonIds: selectedRejectionReasons,
      });

      setCurrentLoanStatus(LoanStatusEnum.REJECTED);

      if (onLoanStatusUpdate) {
        onLoanStatusUpdate({
          id: loanId,
          status: LoanStatusEnum.REJECTED,
        });
      }

      toast.success("Application rejected successfully");
      setLoanId(null); // Close dialog
    } catch (error) {
      toast.error((error as Error).message || "Failed to reject application");
    } finally {
      setIsLoanLoading(false);
      setShowConfirm(null);
    }
  };

  const handleApprove = async (loanId: string, amount: number) => {
    if (!loanId || !brandId) return;
    setIsLoanLoading(true);

    if (!amount || amount <= 0) {
      setPopupError("Please enter a valid loan amount");
      setIsLoanLoading(false);
      return;
    }
    if (!approvedDueDate) {
      setPopupError("Please select a due date for the loan repayment");
      setIsLoanLoading(false);
      return;
    }

    try {
      await updateLoan(loanId, brandId, {
        loanId,
        status: LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED,
        reason: notes,
        approvedLoanAmount: amount,
        approvedDueDate: dayjs(approvedDueDate).format("YYYY-MM-DD"),
      });

      setCurrentLoanStatus(LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED);

      if (onLoanStatusUpdate) {
        onLoanStatusUpdate({
          id: loanId,
          status: LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED,
          amount: amount,
          approvalDate: new Date().toISOString(),
        });
      }

      toast.success("Application approved and forwarded successfully");
      setLoanId(null); // Close dialog
      setShowConfirm(null);
    } catch (error) {
      setPopupError(
        (error as Error).message || "Failed to approve application"
      );
    } finally {
      setIsLoanLoading(false);
    }
  };

  const getCurrentStageItems = () => {
    if (!evaluation) return [];
    if (selectedStage === "ALL") return evaluation.evaluation_item;
    return evaluation.evaluation_item.filter(
      (item) => item.stage === selectedStage
    );
  };

  const currentStageItems = getCurrentStageItems();

  const stats = evaluation
    ? {
      total: currentStageItems.length,
      eligible: currentStageItems.filter((i) => i.status === "ELIGIBLE")
        .length,
      notEligible: currentStageItems.filter(
        (i) => i.status === "NOT_ELIGIBLE"
      ).length,
      overridden: currentStageItems.filter((i) => i.override).length,
    }
    : { total: 0, eligible: 0, notEligible: 0, overridden: 0 };

  const globalStats = evaluation
    ? {
      total: evaluation.evaluation_item.length,
      eligible: evaluation.evaluation_item.filter(
        (i) => i.status === "ELIGIBLE"
      ).length,
    }
    : { total: 0, eligible: 0 };

  const filteredItems = getFilteredItems();

  console.log("filteredItems Data:", filteredItems);


  const allStagesComplete =
    evaluation && globalStats.eligible === globalStats.total;

  const overriddenEligibleItemsWithoutComments =
    evaluation?.evaluation_item.filter(
      (item) =>
        item.override &&
        item.status === "ELIGIBLE" &&
        (!item.comments || item.comments.trim() === "")
    ) || [];

  const isBsaReportRequired =
    evaluation &&
    evaluation.isBsaReportAvailable === false &&
    evaluation.isAaAvailable === false &&
    loan?.forceBsaReportByPass !== true;

  const isCreditReportRequired =
    evaluation &&
    evaluation.isCreditReportAvailable === false &&
    loan?.forceCreditReportByPass !== true;

  const isCamCalculationRequired =
    loan?.is_cam_calculation_required &&
    evaluation &&
    evaluation.is_cam_available === false &&
    loan?.forceCreditReportByPass !== true &&
    brandCamCalculationRequired;

  const canApprove =
    allStagesComplete &&
    overriddenEligibleItemsWithoutComments.length === 0 &&
    !isBsaReportRequired &&
    !isCreditReportRequired &&
    !isCamCalculationRequired;

  // --- RENDERING STARTS HERE ---

  return (
    <Sidebar
      isOpen={!!loanId}
      width="w-full max-full" // Full width sidebar for max space
      onClose={() => setLoanId(null)}
      title={`Risk Evaluation${loan?.formattedLoanId ? ` (${loan.formattedLoanId})` : ""
        }`}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Spinner />
          <span className="ml-2 text-base">Loading evaluation data...</span>
        </div>
      ) : !evaluation ? (
        <div className="text-center py-12 px-6">
          <p className="text-gray-500 mb-4 text-base">
            No evaluation data available.
          </p>
          <Button onClick={initializeEvaluation} size="sm" variant="primary">
            Initialize Evaluation
          </Button>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50 border-t border-gray-200">
          {/* Left Sidebar - Stages and Stats (Wider and Cleaner) */}
          <div className="w-64 border-r border-gray-200 bg-white flex flex-col shadow-sm">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Evaluation Workflow
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* All Stages Button */}
              <button
                onClick={() => setSelectedStage("ALL")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-all duration-150 ${selectedStage === "ALL"
                    ? "bg-blue-50 text-blue-700 font-semibold shadow-inner"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span>Overview (All Stages)</span>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${allStagesComplete
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                    }`}
                >
                  {globalStats.eligible}/{globalStats.total}
                </span>
              </button>

              {/* Individual Stages */}
              {getStages().map((stage) => {
                const stageItems = evaluation.evaluation_item.filter(
                  (item) => item.stage === stage
                );
                const stageStats = {
                  total: stageItems.length,
                  eligible: stageItems.filter((i) => i.status === "ELIGIBLE")
                    .length,
                };
                const isUnlocked = isStageUnlocked(stage);
                const lockedReason = getStageLockedReason(stage);
                const isComplete = stageStats.eligible === stageStats.total;

                const baseClass = isUnlocked
                  ? "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  : "text-gray-400 bg-gray-50 cursor-not-allowed opacity-80";
                const activeClass =
                  selectedStage === stage
                    ? "bg-blue-100 text-blue-800 font-semibold shadow-inner"
                    : baseClass;
                const statusIcon = isComplete ? (
                  <FaCheck className="w-3 h-3 text-green-500" />
                ) : !isUnlocked ? (
                  <FaLock className="w-3 h-3 text-gray-400" />
                ) : (
                  <div className="w-3 h-3"></div> // Placeholder for alignment
                );

                return (
                  <div key={stage} className="relative group">
                    <button
                      onClick={() => isUnlocked && setSelectedStage(stage)}
                      disabled={!isUnlocked}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-all duration-150 ${activeClass}`}
                      title={
                        lockedReason ||
                        stageDescriptions[
                        stage as keyof typeof stageDescriptions
                        ]
                      }
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="flex-shrink-0">{statusIcon}</span>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate">
                            Stage {stage}
                          </span>
                          <span className="text-[10px] text-gray-500 leading-tight truncate">
                            {
                              stageDescriptions[
                              stage as keyof typeof stageDescriptions
                              ]
                            }
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${isComplete
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-600"
                          }`}
                      >
                        {stageStats.eligible}/{stageStats.total}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Overall Stage Status Bar */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                Current View Status
              </h4>
              <div className="grid grid-cols-2 gap-y-1 gap-x-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-600">
                    Pass: <span className="font-medium">{stats.eligible}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-gray-600">
                    Fail:{" "}
                    <span className="font-medium">{stats.notEligible}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span className="text-gray-600">
                    Override:{" "}
                    <span className="font-medium">{stats.overridden}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span className="text-gray-600">
                    Total: <span className="font-medium">{stats.total}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Filter Bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedStage === "ALL"
                      ? "All Evaluation Items"
                      : `Stage ${selectedStage} Items`}
                  </h3>
                  {selectedStage !== "ALL" && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {
                        stageDescriptions[
                        selectedStage as keyof typeof stageDescriptions
                        ]
                      }
                    </p>
                  )}
                </div>
                <div className="flex gap-2 text-sm">
                  {/* Filter Buttons
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                      statusFilter === "ALL"
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    All ({stats.total})
                  </button>
                  <button
                    onClick={() => setStatusFilter("ELIGIBLE")}
                    className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                      statusFilter === "ELIGIBLE"
                        ? "bg-green-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <FaCheck className="inline w-3 h-3 mr-1" /> Pass (
                    {stats.eligible})
                  </button>
                  <button
                    onClick={() => setStatusFilter("NOT_ELIGIBLE")}
                    className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                      statusFilter === "NOT_ELIGIBLE"
                        ? "bg-red-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <FaTimes className="inline w-3 h-3 mr-1" /> Fail (
                    {stats.notEligible})
                  </button>
                  <button
                    onClick={() => setStatusFilter("OVERRIDDEN")}
                    className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                      statusFilter === "OVERRIDDEN"
                        ? "bg-orange-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <FaBolt className="inline w-3 h-3 mr-1" /> Override (
                    {stats.overridden})
                  </button> */}
                  {/* <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-semibold text-sm">
                    {(stats.eligible / stats.total * 100).toFixed(2)}% Risk Score
                  </span> */}
                </div>
              </div>
            </div>

            {/* Main Content: Table */}
            <div className="flex-1 overflow-auto p-4">
              {filteredItems.length > 0 ? (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 w-3/12">
                            Parameter / Source
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 w-2/12">
                            Required Value
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 w-2/12">
                            Actual Value
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 w-2/12">
                            Evaluation Status
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 w-3/12">
                            Comments
                          </th>
                          {/* Removed Status column */}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredItems.map((item) => (
                          <tr
                            key={item.id}
                            className={`transition-all duration-150 group ${updatingItems[item.id]
                                ? "opacity-60 bg-gray-50"
                                : "hover:bg-blue-50/50"
                              } ${item.override &&
                                item.status === "ELIGIBLE" &&
                                (!item.comments || item.comments.trim() === "")
                                ? "bg-orange-50 border-l-4 border-l-orange-400"
                                : "bg-white border-l-4 border-l-transparent"
                              }`}
                          >
                            {/* Parameter/Source */}
                            <td className="px-4 py-2.5">
                              <div>
                                <div className="font-medium text-gray-900 leading-snug">
                                  {Conversion.isValidAadhaar(item.parameter)}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 italic">
                                  Source: {Conversion.isValidAadhaar(item.source)}
                                </div>
                              </div>
                            </td>

                            {/* Required Value */}
                            <td className="px-4 py-2.5 text-gray-700">
                              <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded-md">
                                {item.requiredValue || "N/A"}
                              </span>
                            </td>

                            {/* Actual Value Input */}
                            <td className="px-4 py-2.5">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={item.actualValue.startsWith("BHD")
                                    ? Conversion.formatCurrency(
                                      Number(item.actualValue.replace(/BHD\s?|,/g, ""))
                                    )
                                    : item.actualValue}
                                  onChange={(e) =>
                                    handleActualValueChange(
                                      item.id,
                                      e.target.value
                                    )
                                  }
                                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm transition-shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 peer"
                                  placeholder="Enter value"
                                  disabled={updatingItems[item.id]}
                                />
                                {/* Tooltip that shows only on input hover */}
                                <div className="absolute invisible opacity-0 peer-hover:visible peer-hover:opacity-100 transition-all duration-200 bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
                                  <div className="bg-gray-900 text-white text-xs rounded-md py-2 px-3 whitespace-nowrap max-w-xs break-words">
                                    {item.actualValue.startsWith("BHD")
                                      ? Conversion.formatCurrency(
                                        Number(item.actualValue.replace(/BHD\s?|,/g, ""))
                                      )
                                      : item.actualValue || "No value"}
                                    {/* Tooltip arrow */}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Status Buttons */}
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    handleStatusChange(item.id, "ELIGIBLE")
                                  }
                                  disabled={updatingItems[item.id]}
                                  className={`px-2 py-1 text-xs rounded-full transition-all duration-150 flex items-center gap-1 ${item.status === "ELIGIBLE"
                                      ? "bg-green-100 text-green-700 font-semibold border border-green-300"
                                      : "bg-gray-100 text-gray-600 hover:bg-green-50"
                                    }`}
                                >
                                  <FaCheck className="w-2.5 h-2.5" /> PASS
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(item.id, "NOT_ELIGIBLE")
                                  }
                                  disabled={updatingItems[item.id]}
                                  className={`px-2 py-1 text-xs rounded-full transition-all duration-150 flex items-center gap-1 ${item.status === "NOT_ELIGIBLE"
                                      ? "bg-red-100 text-red-700 font-semibold border border-red-300"
                                      : "bg-gray-100 text-gray-600 hover:bg-red-50"
                                    }`}
                                >
                                  <FaTimes className="w-2.5 h-2.5" /> FAIL
                                </button>
                                {item.override && (
                                  <span
                                    className="px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full font-medium shadow-md"
                                    title="Manually Overridden"
                                  >
                                    <FaBolt className="inline w-2.5 h-2.5" />
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Comments Textarea */}
                            <td className="px-4 py-2.5">
                              <div className="relative">
                                <textarea
                                  value={
                                    pendingComments[item.id] !== undefined
                                      ? pendingComments[item.id]
                                      : item.comments
                                  }
                                  onChange={(e) =>
                                    handleCommentsChange(
                                      item.id,
                                      e.target.value
                                    )
                                  }
                                  onBlur={(e) => {
                                    // Immediate save on blur for better UX
                                    if (
                                      e.target.value.trim() &&
                                      debouncedSaveComments.current[item.id]
                                    ) {
                                      debouncedSaveComments.current[
                                        item.id
                                      ].cancel(); // Cancel any pending debounce
                                      handleAutoSaveComments(
                                        item.id,
                                        e.target.value
                                      );
                                    }
                                  }}
                                  rows={1}
                                  placeholder={
                                    item.override && item.status === "ELIGIBLE"
                                      ? "Override comment required..."
                                      : "Add optional comment..."
                                  }
                                  className={`w-full border rounded-md px-3 py-1.5 text-sm transition-shadow focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden ${item.override &&
                                      item.status === "ELIGIBLE" &&
                                      (!item.comments ||
                                        item.comments.trim() === "")
                                      ? "border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/50"
                                      : "border-gray-300"
                                    } ${savingComments[item.id] ? "pr-8" : ""} ${pendingComments[item.id] !== undefined &&
                                      !savingComments[item.id]
                                      ? "pr-8"
                                      : ""
                                    }`}
                                  disabled={
                                    updatingItems[item.id] ||
                                    savingComments[item.id]
                                  }
                                />
                                {/* Saving indicator */}
                                {savingComments[item.id] && (
                                  <div className="absolute right-2 top-2">
                                    <FaSpinner className="w-3 h-3 animate-spin text-blue-500" />
                                  </div>
                                )}
                                {/* Unsaved changes indicator */}
                                {pendingComments[item.id] !== undefined &&
                                  !savingComments[item.id] && (
                                    <div className="absolute right-2 top-2 text-xs text-gray-400">
                                      •
                                    </div>
                                  )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center py-16 bg-white rounded-lg shadow-lg border border-gray-200">
                  {selectedStage !== "ALL" &&
                    !isStageUnlocked(selectedStage) ? (
                    <div className="text-center p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                      <FaLock className="w-6 h-6 text-yellow-500 mx-auto mb-3" />
                      <p className="text-base font-semibold text-yellow-800">
                        Stage Locked
                      </p>
                      <p className="text-sm text-yellow-600 mt-1.5">
                        {getStageLockedReason(selectedStage)}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <div className="text-4xl mb-3">📄</div>
                      <p className="text-lg">
                        {statusFilter !== "ALL"
                          ? `No ${statusFilter
                            .toLowerCase()
                            .replace("_", " ")} items found in this view.`
                          : "No evaluation items matched the current filter."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Decision Footer - ALIGNMENT FIX APPLIED HERE */}
            <div className="border-t border-gray-200 bg-white p-4 sticky bottom-0 z-10 shadow-lg">
              {/* Warnings Section (Unchanged) */}
              {/* <div className="space-y-2 mb-3">
                {isBsaReportRequired && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-800 flex items-start gap-2">
                    <FaExclamationTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Compliance Required:</span>{" "}
                      Loan cannot be approved as **BSA Report is not available**
                      and Account Aggregator data is also unavailable.
                    </div>
                  </div>
                )}
                {isCreditReportRequired && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-800 flex items-start gap-2">
                    <FaExclamationTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Compliance Required:</span>{" "}
                      Loan cannot be approved as **Credit Report is not
                      available**.
                    </div>
                  </div>
                )}
                {isCamCalculationRequired && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-800 flex items-start gap-2">
                    <FaExclamationTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Action Required:</span> Loan
                      cannot be approved as **CAM Calculation is required but
                      not available**.
                    </div>
                  </div>
                )}
                Stage Completion Warning
                {!canApprove &&
                  !isBsaReportRequired &&
                  !isCreditReportRequired && (
                    <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-sm text-yellow-800 flex items-start gap-2">
                      <FaExclamationTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Action Required:</span>{" "}
                        Evaluation Incomplete. Please resolve **
                        {globalStats.total - globalStats.eligible}** pending
                        items and
                        {overriddenEligibleItemsWithoutComments.length > 0 &&
                          ` add comments to **${overriddenEligibleItemsWithoutComments.length}** overridden items.`}
                      </div>
                    </div>
                  )}
                Comments Warning for Audit Trail
                {allStagesComplete &&
                  overriddenEligibleItemsWithoutComments.length > 0 &&
                  !isBsaReportRequired &&
                  !isCreditReportRequired && (
                    <div className="p-3 bg-orange-100 border border-orange-300 rounded-lg text-sm text-orange-800 flex items-start gap-2">
                      <FaExclamationTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Audit Requirement:</span>{" "}
                        Add comments to **
                        {overriddenEligibleItemsWithoutComments.length}**
                        overridden eligible items before approval.
                      </div>
                    </div>
                  )}
              </div> */}

              {/* Notes and Action Buttons - FIX: Changed items-end to items-center */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Decision Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-sm"
                    rows={2}
                    placeholder="Document your final decision notes, even for rejections..."
                  />
                  {!notes.trim() && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <FaClock className="w-3 h-3" /> Decision notes are
                      mandatory to proceed.
                    </p>
                  )}
                </div>

                <div className="flex gap-2.5 flex-shrink-0">
                  <Button
                    onClick={() => setShowConfirm("reject")}
                    disabled={
                      isLoanLoading ||
                      currentLoanStatus !== LoanStatusEnum.PENDING ||
                      !notes.trim()
                    }
                    variant="danger"
                    size="lg" // Larger buttons for primary actions
                    className="flex items-center gap-2"
                  >
                    {isLoanLoading && showConfirm === "reject" ? (
                      <FaSpinner className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <FaTimes className="w-4 h-4" /> Reject
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setShowConfirm("approve")}
                    disabled={
                      isLoanLoading ||
                      currentLoanStatus !== LoanStatusEnum.PENDING ||
                      !notes.trim() ||
                      !canApprove
                    }
                    variant="primary"
                    size="lg" // Larger buttons for primary actions
                    className="flex items-center gap-2"
                    title={
                      !canApprove
                        ? `Cannot approve: ${isBsaReportRequired
                          ? "BSA/AA Report Missing."
                          : isCreditReportRequired
                            ? "Credit Report Missing."
                            : isCamCalculationRequired
                              ? "CAM Calculation Missing."
                              : !allStagesComplete
                                ? `Evaluation incomplete (${globalStats.eligible}/${globalStats.total} items completed).`
                                : overriddenEligibleItemsWithoutComments.length >
                                  0
                                  ? `Comments required for ${overriddenEligibleItemsWithoutComments.length} overrides.`
                                  : ""
                        }`
                        : "Ready for approval"
                    }
                  >
                    {isLoanLoading && showConfirm === "approve" ? (
                      <FaSpinner className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <FaCheck className="w-4 h-4" /> Approve
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog (Unchanged structure) */}
      <ConfirmationDialog
        isOpen={!!showConfirm}
        onClose={() => {
          setShowConfirm(null);
          setPopupError(null);
          setApprovedLoanAmount(null);
          setApprovedDueDate(null);
          setSelectedRejectionReasons([]);
          setRejectionReasonsValid(false);
        }}
        showConfirm={showConfirm}
        isLoanLoading={isLoanLoading}
        approvedLoanAmount={approvedLoanAmount}
        setApprovedLoanAmount={setApprovedLoanAmount}
        approvedDueDate={approvedDueDate}
        setApprovedDueDate={setApprovedDueDate}
        popupError={popupError}
        setPopupError={setPopupError}
        loanId={loanId}
        onApprove={handleApprove}
        onReject={handleReject}
        brandId={brandId}
        loan={loan}
        selectedRejectionReasons={selectedRejectionReasons}
        setSelectedRejectionReasons={setSelectedRejectionReasons}
        rejectionReasonsValid={rejectionReasonsValid}
        setRejectionReasonsValid={setRejectionReasonsValid}
        salary={evaluation?.user?.employment?.salary}
      />
    </Sidebar>
  );
}
