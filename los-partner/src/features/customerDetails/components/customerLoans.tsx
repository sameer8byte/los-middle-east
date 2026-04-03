import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { CgArrowRight } from "react-icons/cg";

import { LoanStatusEnum, PartnerUserRoleEnum } from "../../../constant/enum";
import { UpdateLoanAmount } from "./updateLoanAmount";
import { CreateRepaymentTimeline } from "./repayment/createRepaymentTimeline";
import { formatDate } from "../../../lib/utils";
import { Spinner } from "../../../common/ui/spinner";
import { LoanEvaluation } from "./evaluation/create.evaluation";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaClock,
  FaMoneyBillWave,
  FaFileAlt,
  FaChartLine,
  FaCoins,
  FaReceipt,
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronUp,
  FaInfoCircle,
  FaCommentDots,
} from "react-icons/fa";
import { RepaymentTimelines } from "./repayment/repaymentTimeline";
import { toast } from "react-toastify";
import { TransactionsDetails } from "./payment/transactionsDetails";
import { getCustomerLoans } from "../../../shared/services/api/customer.api";
import { upsertEvaluation } from "../../../shared/services/api/evaluation.api";
import { getLoanStatement } from "../../../shared/services/api/loan.api";
import { EvaluationV2Component } from "./evaluationV2";
import { Loan } from "../../../shared/types/loan";
import { useAppDispatch, useAppSelector } from "../../../shared/redux/store";
import { updateLoanData } from "../../../shared/redux/slices/user";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";
import { CamCalculator } from "./camCalculator";
import { NonGetwayPayment } from "../../loanCollection/components/nonGetwayPayment";
import { ClosingWriteOffType } from "../../loanCollection/components/closingWriteOff";
import { ClosingSettlementType } from "../../loanCollection/components/closingSettlement";
import {
  getLoanComments,
  addLoanComment,
  LoanComment,
} from "../../../shared/services/api/loanComments.api";
import { Button } from "../../../common/ui/button";
import { SkipEvaluationApproval } from "./skipEvaluationApproval";
import { AddRemarksButton } from "../../../common/ui/AddRemarksButton";
import { AcefoneClickToDialButton } from "../../acefone";
import { RemarksCommentModal } from "../../../common/ui/RemarksCommentModal";
import { Conversion } from "../../../utils/conversion";

export function CustomerLoans(
  { isOnlyPendingLoans = false }: { isOnlyPendingLoans?: boolean } = {
    isOnlyPendingLoans: false,
  }
) {
  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    loanId: string | null;
    currentComment: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    loanId: null,
    currentComment: "",
    isLoading: false,
  });
  // Comment modal handlers
  const openCommentModal = (loanId: string) => {
    setCommentModal({
      isOpen: true,
      loanId,
      currentComment: "",
      isLoading: false,
    });
  };

  const closeCommentModal = () => {
    setCommentModal({
      isOpen: false,
      loanId: null,
      currentComment: "",
      isLoading: false,
    });
  };

  const brand = useAppSelector((state) => state.brand);
  const { setQuery, getQuery } = useQueryParams();
  const user = useAppSelector((state) => state.auth.data);
  const isSuperAdmin = user.role.includes(PartnerUserRoleEnum.SUPER_ADMIN);
  const [skipEvaluationApprovalLoanId, setSkipEvaluationApprovalLoanId] =
    useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<"approve" | "reject" | null>(
    null
  );
  const paymentRequestIdLoanId = getQuery("paymentRequestIdLoanId");
  const writeOffLoanId = getQuery("writeOffLoanId");
  const settlementLoanId = getQuery("settlementLoanId");

  const evaluationId = getQuery("evaluationId");
  const [evaluationV2LoanId, setEvaluationV2LoanId] = useState<string | null>(
    null
  );
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const createRepaymentTimelineLoanId = getQuery(
    "createRepaymentTimelineLoanId"
  );

  const repaymentTimelineLoanId = getQuery("repaymentTimelineLoanId");
  const updateLoanId = getQuery("updateLoanId");
  const searchParams = new URLSearchParams(window.location.search);
  const { brandId, customerId } = useParams();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState<string | null>(
    null
  );
  const [nonGetwayPaymentLoanId, setNonGetwayPaymentLoanId] = useState<
    string | null
  >(null);
  const [nonGetwayPaymentUserId, setNonGetwayPaymentUserId] = useState<
    string | null
  >(null);
  const [refresh, setRefresh] = useState(false);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [loanComments, setLoanComments] = useState<{
    [loanId: string]: LoanComment[];
  }>({});
  const [loadingComments, setLoadingComments] = useState<{
    [loanId: string]: boolean;
  }>({});
  const [statementLoading, setStatementLoading] = useState<string | null>(
    null
  );
  useEffect(() => {
    if (!customerId || !brandId) return;
    const fetchCustomerLoansData = async () => {
      try {
        setIsLoading(true);
        const response = await getCustomerLoans(customerId);
        dispatch(updateLoanData(response));
        setLoans(response);
      } catch (error) {
        console.error("Error fetching customer loans data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerLoansData();
  }, [brandId, customerId, dispatch, refresh]);

  const fetchEvaluation = useCallback(
    async (userId: string, brandId: string, loanId: string) => {
      if (!userId || !brandId || !loanId) {
        console.error("Missing required parameters for evaluation");
        return;
      }
      try {
        setEvaluationLoading(loanId);
        const response = await upsertEvaluation(userId, brandId, loanId);
        if (!response) {
          alert("Failed to fetch evaluation data");
          throw new Error("Network response was not ok");
        }
        setQuery("evaluationId", response.id);
      } catch (error) {
        console.error("Error fetching evaluation data:", error);
      } finally {
        setEvaluationLoading(null);
      }
    },
    [setQuery]
  );

  const fetchLoanComments = useCallback(
    async (loanId: string) => {
      if (!brandId) return;

      setLoadingComments((prev) => ({ ...prev, [loanId]: true }));

      try {
        const response = await getLoanComments(brandId, loanId);
        setLoanComments((prev) => ({ ...prev, [loanId]: response.comments }));
      } catch (error) {
        console.error("Error fetching loan comments:", error);
        toast.error("Failed to load comments");
      } finally {
        setLoadingComments((prev) => ({ ...prev, [loanId]: false }));
      }
    },
    [brandId]
  );

  const handleLoanStatement = useCallback(
    async (userId: string, loanId: string) => {
      if (!userId || !loanId) {
        toast.error("Missing required parameters");
        return;
      }

      if (statementLoading === loanId) {
        return;
      }

      setStatementLoading(loanId);

      try {
        const statementData = await getLoanStatement(userId, loanId);
        
        if (brand.brandConfig.loanAgreementFooter) {
          statementData.brand.loanAgreementFooter = brand.brandConfig.loanAgreementFooter;
        }
        
        // Generate PDF using the statement data
        const { generateLoanStatement } = await import('../../../utils/loanStatementGenerator');
        const pdfBytes = await generateLoanStatement(statementData);
        
        // Download PDF
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `loan-statement-${statementData.formattedLoanId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success("Statement generated successfully");
      } catch (error) {
        console.error("Error generating statement:", error);
        toast.error("Failed to generate statement");
      } finally {
        setStatementLoading(null);
      }
    },
    [statementLoading, brand.brandConfig.loanAgreementFooter]
  );

  // Handle loan status updates from Evaluation component
  const handleLoanStatusUpdate = (updatedLoan: Partial<Loan>) => {
    setLoans((prevLoans) =>
      prevLoans.map((loan) =>
        loan.id === updatedLoan.id ? { ...loan, ...updatedLoan } : loan
      )
    );

    // Update the current loan being evaluated
    if (loan?.id === updatedLoan.id) {
      setLoan((prevLoan) =>
        prevLoan ? { ...prevLoan, ...updatedLoan } : null
      );
    }

    // Show status update notification with enhanced styling
    const statusMessage =
      updatedLoan.status === LoanStatusEnum.REJECTED
        ? "Loan application has been rejected"
        : updatedLoan.status === LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED
        ? "Loan application has been approved and forwarded"
        : "Loan status has been updated";

    toast.success(statusMessage);

    // Update Redux store
    dispatch(
      updateLoanData(
        loans.map((loan) =>
          loan.id === updatedLoan.id ? { ...loan, ...updatedLoan } : loan
        )
      )
    );
  };

  const handleCommentSubmit = useCallback(async () => {
    if (!commentModal.loanId || !commentModal.currentComment.trim()) {
      toast.error("Please enter a remark");
      return;
    }

    if (!brandId) {
      toast.error("Brand ID not found");
      return;
    }

    setCommentModal((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      await addLoanComment(brandId, {
        loanId: commentModal.loanId,
        comment: commentModal.currentComment,
      });

      toast.success("Remark added successfully");

      // Refresh comments for this loan
      if (commentModal.loanId) {
        setLoadingComments((prev) => ({
          ...prev,
          [commentModal.loanId!]: true,
        }));

        try {
          const response = await getLoanComments(brandId, commentModal.loanId);
          setLoanComments((prev) => ({
            ...prev,
            [commentModal.loanId!]: response.comments,
          }));
        } catch {
          // Handle error silently
        } finally {
          setLoadingComments((prev) => ({
            ...prev,
            [commentModal.loanId!]: false,
          }));
        }
      }

      closeCommentModal();
    } catch {
      toast.error("Failed to add remark");
    } finally {
      setCommentModal((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [commentModal, brandId]);

  const getStatusIcon = (status: LoanStatusEnum) => {
    switch (status) {
      case LoanStatusEnum.PENDING:
        return <FaClock className="w-4 h-4 text-[var(--color-warning)]" />;
      case LoanStatusEnum.APPROVED:
      case LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED:
      case LoanStatusEnum.SANCTION_MANAGER_APPROVED:
        return (
          <FaCheckCircle className="w-4 h-4 text-[var(--color-on-success)]" />
        );
      case LoanStatusEnum.REJECTED:
        return (
          <FaTimesCircle className="w-4 h-4 text-[var(--color-on-error)]" />
        );
      case LoanStatusEnum.DISBURSED:
      case LoanStatusEnum.ACTIVE:
        return (
          <FaMoneyBillWave className="w-4 h-4 text-[var(--color-on-primary)]" />
        );
      default:
        return (
          <FaFileAlt className="w-4 h-4 text-[var(--color-on-surface)] opacity-70" />
        );
    }
  };

  const sortedLoans = useMemo(() => {
    const getPriority = (status: LoanStatusEnum): number => {
      if (
        status === LoanStatusEnum.REJECTED ||
        status === LoanStatusEnum.CANCELLED
      )
        return 3;
      if (
        status === LoanStatusEnum.PAID ||
        status === LoanStatusEnum.COMPLETED ||
        status === LoanStatusEnum.WRITE_OFF ||
        status === LoanStatusEnum.SETTLED
      )
        return 2;
      return 1;
    };

    const filtered = isOnlyPendingLoans
      ? loans.filter((loan) => loan.status === LoanStatusEnum.PENDING)
      : loans;

    return [...filtered].sort((a, b) => {
      const priorityDiff = getPriority(a.status) - getPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      return (
        new Date(b.createdAt || b.applicationDate).getTime() -
        new Date(a.createdAt || a.applicationDate).getTime()
      );
    });
  }, [loans, isOnlyPendingLoans]);

  const getStatusColor = useCallback(
    (
      status: string,
      type: "agreement" | "payment" | "transaction" = "agreement"
    ) => {
      const colors: Record<string, string> = {
        SIGNED: "bg-green-100 text-green-800",
        SUCCESS: "bg-green-100 text-green-800",
        SENT: "bg-yellow-100 text-yellow-800",
        PENDING: "bg-yellow-100 text-yellow-800",
        REJECTED: "bg-red-100 text-red-800",
        FAILED: "bg-red-100 text-red-800",
      };
      const base = colors[status] || "bg-gray-100 text-gray-800";
      if (type === "agreement") return base;
      const padding = type === "transaction" ? "px-1.5 py-0.5" : "px-2 py-0.5";
      return `inline-flex items-center ${padding} rounded text-[10px] font-medium ${base}`;
    },
    []
  );

  const completedStatuses = [
    LoanStatusEnum.PAID,
    LoanStatusEnum.COMPLETED,
    LoanStatusEnum.WRITE_OFF,
    LoanStatusEnum.SETTLED,
  ];

  const getPenaltyPaid = (loan: Loan) => {
    // Only show for repeat loans
    if (!loan.is_repeat_loan) {
      return null;
    }

    // Only show for completed loans
    if (!completedStatuses.includes(loan.status)) {
      return null;
    }

    // Only show if loan had overdue penalties
    if (!loan.had_overdue_penalties) {
      return null;
    }

    // Return the penalty amount from backend
    return loan.totalPenalty || null;
  };

  const getCollectionStatus = (loan: Loan) => {
    if (!loan.is_repeat_loan) {
      return null;
    }

    if (!completedStatuses.includes(loan.status)) {
      return null;
    }

    if (!loan.loanDetails?.dueDate) return null;

    let actualPaymentDate: string | null = null;

    // check payment request
    if (loan.paymentRequests?.length > 0) {
      for (const request of loan.paymentRequests) {
        if (request.collectionTransactions?.length > 0) {
          const successfulTransaction = request.collectionTransactions.find(
            (transaction) =>
              transaction.status === "SUCCESS" && transaction.completedAt
          );
          if (successfulTransaction?.completedAt) {
            actualPaymentDate = successfulTransaction.completedAt;
            break;
          }
        }
      }
    }

    if (!actualPaymentDate && loan.closureDate) {
      actualPaymentDate = loan.closureDate;
    }
    if (!actualPaymentDate && loan.updatedAt) {
      actualPaymentDate = loan.updatedAt;
    }

    if (!actualPaymentDate) {
      console.log("no payment date found");
      return null;
    }

    const dueDate = new Date(loan.loanDetails?.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const paidDate = new Date(actualPaymentDate);
    paidDate.setHours(0, 0, 0, 0);
    const diffTime = paidDate.getTime() - dueDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return {
        label: `Pre closure - ${Math.abs(diffDays)} days before`,
        color: "bg-blue-100 text-blue-700 border-none",
      };
    } else if (diffDays === 0) {
      return {
        label: "On time payment",
        color: "bg-green-100 text-green-700",
      };
    } else {
      return {
        label: `DPD - ${diffDays} days after`,
        color: "bg-red-100 text-red-700 border-red-200",
      };
    }
  };

  return (
    <div className="space-y-3">
      {updateLoanId && <UpdateLoanAmount />}
      {createRepaymentTimelineLoanId && <CreateRepaymentTimeline />}
      {repaymentTimelineLoanId && <RepaymentTimelines />}
      {evaluationId && loan && brand.brandConfig.evaluationVersion === "V1" && (
        <LoanEvaluation
          loan={loan}
          onLoanStatusUpdate={handleLoanStatusUpdate}
        />
      )}
      {evaluationV2LoanId && brand.brandConfig.evaluationVersion === "V2" && (
        <EvaluationV2Component
          loanId={evaluationV2LoanId}
          userId={loan?.userId || ""}
          setLoanId={setEvaluationV2LoanId}
          loan={loans.find((l) => l.id === evaluationV2LoanId) || loan}
          onLoanStatusUpdate={handleLoanStatusUpdate}
        />
      )}
      {paymentRequestIdLoanId && <TransactionsDetails />}

      {skipEvaluationApprovalLoanId && showConfirm && (
        <SkipEvaluationApproval
          loanId={skipEvaluationApprovalLoanId}
          setLoanId={setSkipEvaluationApprovalLoanId}
          showConfirm={showConfirm}
          setShowConfirm={setShowConfirm}
          loan={loans.find((l) => l.id === skipEvaluationApprovalLoanId)!}
          onLoanStatusUpdate={handleLoanStatusUpdate}
        />
      )}
      {nonGetwayPaymentLoanId && (
        <NonGetwayPayment
          refresh={refresh}
          setRefresh={setRefresh}
          nonGetwayPaymentLoanId={nonGetwayPaymentLoanId}
          nonGetwayPaymentUserId={nonGetwayPaymentUserId}
          setNonGetwayPaymentLoanId={setNonGetwayPaymentLoanId}
          setNonGetwayPaymentUserId={setNonGetwayPaymentUserId}
        />
      )}
      {writeOffLoanId && <ClosingWriteOffType loanId={writeOffLoanId} />}
      {settlementLoanId && <ClosingSettlementType loanId={settlementLoanId} />}

      {/* Remarks Comment Modal */}
      <RemarksCommentModal
        isOpen={commentModal.isOpen}
        loanId={commentModal.loanId}
        currentComment={commentModal.currentComment}
        isLoading={commentModal.isLoading}
        loans={loans}
        onClose={closeCommentModal}
        onCommentChange={(comment) =>
          setCommentModal((prev) => ({ ...prev, currentComment: comment }))
        }
        onSubmit={handleCommentSubmit}
        loanComments={loanComments}
        loadingComments={loadingComments}
      />

      {/* Table Card */}
      <div className="bg-[var(--color-background)] rounded-xl shadow-sm border border-[var(--color-muted)] border-opacity-30 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--color-muted)] border-opacity-30 bg-gradient-to-r from-[var(--color-surface)] to-[var(--color-surface)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <FaFileAlt className="w-4 h-4 text-[var(--color-on-primary)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-on-background)]">
                {isOnlyPendingLoans ? "Pending Loans" : "Loan Applications"}
              </h3>
              <p className="text-[11px] text-[var(--color-on-surface)] opacity-70">
                {isLoading
                  ? "Loading..."
                  : `${sortedLoans.length} total records`}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner />
              <span className="mt-3 text-sm text-[var(--color-on-surface)] opacity-70">
                Loading loan applications...
              </span>
            </div>
          ) : sortedLoans.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
                <FaFileAlt className="w-6 h-6 text-[var(--color-on-surface)] opacity-50" />
              </div>
              <p className="text-sm font-medium text-[var(--color-on-background)]">
                No loan applications found
              </p>
              <p className="text-xs text-[var(--color-on-surface)] opacity-60 mt-1">
                Applications will appear here once created
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--color-surface)] bg-opacity-50 border-b border-[var(--color-muted)] border-opacity-30">
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider w-10"></th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                    Loan ID
                  </th>
                  {/* Old Loan ID */}
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                    Old Loan ID
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                    Collection Status
                  </th>

                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                    Penalty Paid
                  </th>

                  {!isOnlyPendingLoans && (
                    <>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                        Applied
                      </th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                        Due Date
                      </th>
                    </>
                  )}
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {sortedLoans.map((loan) => {
                  const isExpanded = expandedLoanId === loan.id;
                  return (
                    <>
                      <tr
                        key={loan.id}
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isExpanded ? "bg-slate-50/30" : ""
                        }`}
                      >
                        {/* Expand Toggle */}
                        <td className="px-3 py-3">
                          {!isOnlyPendingLoans && (
                            <button
                              onClick={() => {
                                const newId = isExpanded ? null : loan.id;
                                setExpandedLoanId(newId);
                                if (newId && !loanComments[loan.id])
                                  fetchLoanComments(loan.id);
                              }}
                              className={`p-1.5 rounded-md transition-all ${
                                isExpanded
                                  ? "bg-slate-200 text-slate-700"
                                  : "hover:bg-slate-100 text-slate-400"
                              }`}
                            >
                              {isExpanded ? (
                                <FaChevronUp className="w-3 h-3" />
                              ) : (
                                <FaChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </td>

                        {/* Loan ID */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              {getStatusIcon(loan.status)}
                            </div>
                            <span className="text-[13px] font-semibold text-slate-800">
                              {loan.formattedLoanId || loan.id.split('-')[0]}
                            </span>
                            {loan.id && (
                              <AcefoneClickToDialButton
                                userId={loan.userId}
                                loanId={loan.id}
                              />
                            )}
                          </div>
                        </td>

                        {/* Old Loan ID */}
                        <td className="px-3 py-3">
                          {loan.oldLoanId ? (
                            <span className="text-[13px] font-semibold text-blue-600 hover:underline cursor-pointer">
                              {loan.oldLoanId}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[13px]">—</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-3 py-3">
                          <span className="text-[13px] font-bold text-slate-900">
                            {Conversion.formatCurrency(loan.amount)}
                          </span>
                          {loan.purpose && (
                            <p className="text-[10px] text-slate-400 capitalize truncate max-w-[120px] mt-0.5">
                              {loan.purpose}
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 ">
                          <LoanStatusBadge status={loan.status} />
                        </td>

                        {/* collection status */}
                        <td className="px-3 py-3">
                          {(() => {
                            const status = getCollectionStatus(loan);
                            return status ? (
                              <span
                                className={`inline-flex items-center px-4 py-1 rounded-xl text-[13px] font-medium whitespace-nowrap ${status.color}`}
                              >
                                {status.label}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            );
                          })()}
                        </td>

                        <td className="px-3 py-3">
                          {(() => {
                            const penaltyAmount = getPenaltyPaid(loan);
                            return penaltyAmount !== null ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-xl text-[13px] font-semibold bg-orange-100 text-orange-700 border-orange-200 whitespace-nowrap">
                                BHD{penaltyAmount.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            );
                          })()}
                        </td>

                        {/* Dates */}
                        {!isOnlyPendingLoans && (
                          <>
                            <td className="px-3 py-3 text-[12px] text-slate-600">
                              {formatDate(loan.applicationDate)}
                            </td>
                            <td className="px-3 py-3 text-[12px] text-slate-600">
                              {loan.loanDetails?.dueDate ? (
                                formatDate(loan.loanDetails.dueDate)
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </>
                        )}

                        {/* Actions */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <CamCalculator
                              loan={loan}
                              refresh={refresh}
                              setRefresh={setRefresh}
                            />
                            {[
                              LoanStatusEnum.PAID,
                              LoanStatusEnum.COMPLETED,
                              LoanStatusEnum.ACTIVE,
                              LoanStatusEnum.SETTLED,
                              LoanStatusEnum.POST_ACTIVE,
                              LoanStatusEnum.PARTIALLY_PAID,
                            ].includes(loan.status) && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoanStatement(loan.userId, loan.id);
                                }}
                                disabled={statementLoading === loan.id}
                              >
                                {statementLoading === loan.id ? (
                                  <Spinner theme="light" />
                                ) : (
                                  <FaFileAlt className="w-3.5 h-3.5" />
                                )}
                                <span>Statement</span>
                              </Button>
                            )}
                            {loan.status === LoanStatusEnum.PENDING ? (
                              <>
                                {loan?.is_skip_evaluation_approval ? (
                                  <select
                                    value={showConfirm || ""}
                                    onChange={(e) => {
                                      setSkipEvaluationApprovalLoanId(loan.id);
                                      setShowConfirm(
                                        (e.target.value as
                                          | "approve"
                                          | "reject") || null
                                      );
                                    }}
                                    className="px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                                  >
                                    <option value="">
                                      Select action(reloan approval)
                                    </option>
                                    <option value="approve">Approve</option>
                                    <option value="reject">Reject</option>
                                  </select>
                                ) : (
                                  <>
                                    {brand?.brandConfig?.evaluationVersion ===
                                      "V1" && (
                                      <Button
                                        onClick={() => {
                                          setLoan(loan);
                                          fetchEvaluation(
                                            loan.userId,
                                            brandId || "",
                                            loan.id
                                          );
                                        }}
                                        disabled={evaluationLoading === loan.id}
                                      >
                                        {evaluationLoading === loan.id ? (
                                          <Spinner theme="light" />
                                        ) : (
                                          <FaEye className="w-3.5 h-3.5" />
                                        )}
                                        <span>Evaluate</span>
                                      </Button>
                                    )}
                                    {brand?.brandConfig?.evaluationVersion ===
                                      "V2" && (
                                      <Button
                                        onClick={() =>
                                          setEvaluationV2LoanId(loan.id)
                                        }
                                      >
                                        <FaFileAlt className="w-3.5 h-3.5" />
                                        <span>Risk</span>
                                      </Button>
                                    )}
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                {!isOnlyPendingLoans && (
                                  <Button
                                    onClick={() => {
                                      searchParams.set("loanId", loan.id);
                                      navigate({
                                        pathname: window.location.pathname,
                                        search: searchParams.toString(),
                                      });
                                    }}
                                  >
                                    <FaEye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                    <CgArrowRight className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {[
                                  LoanStatusEnum.ACTIVE,
                                  LoanStatusEnum.POST_ACTIVE,
                                  LoanStatusEnum.PARTIALLY_PAID,
                                ].includes(loan.status) && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNonGetwayPaymentLoanId(loan.id);
                                      setNonGetwayPaymentUserId(loan.userId);
                                    }}
                                  >
                                    <FaMoneyBillWave className="w-3.5 h-3.5" />
                                    <span>Payment</span>
                                  </Button>
                                )}
                                {[
                                  LoanStatusEnum.PAID,
                                  LoanStatusEnum.COMPLETED,
                                  LoanStatusEnum.WRITE_OFF,
                                  LoanStatusEnum.SETTLED,
                                ].includes(loan.status) && (
                                  <Button
                                    onClick={() =>
                                      setQuery(
                                        "paymentRequestIdLoanId",
                                        loan.id
                                      )
                                    }
                                  >
                                    <FaCheckCircle className="w-3.5 h-3.5" />
                                    <span>Transactions</span>
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && !isOnlyPendingLoans && (
                        <tr key={`${loan.id}-expanded`}>
                          <td
                            colSpan={8}
                            className="p-0 bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface)] bg-opacity-30"
                          >
                            <div className="p-4 border-t border-[var(--color-muted)] border-opacity-30">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {/* Financial Summary */}
                                {(loan.repayment ||
                                  loan.disbursement ||
                                  loan.costSummary) && (
                                  <div className="bg-[var(--color-background)] rounded-lg border border-[var(--color-muted)] border-opacity-30 p-3 shadow-sm">
                                    <h6 className="text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                      <FaChartLine className="w-3.5 h-3.5 text-[var(--color-on-surface)] opacity-50" />{" "}
                                      Financial Summary
                                    </h6>
                                    <div className="grid grid-cols-3 gap-3 text-xs">
                                      {loan?.amount && (
                                        <div className="bg-[var(--color-surface)] rounded-md p-2">
                                          <span className="text-[var(--color-on-surface)] opacity-70 text-[10px] block">
                                            Principal
                                          </span>
                                          <span className="font-bold text-[var(--color-on-background)]">
                                            BHD
                                            {loan.amount.toLocaleString()}
                                          </span>
                                        </div>
                                      )}
                                      {loan.repayment?.totalObligation && (
                                        <div className="bg-[var(--color-error)] bg-opacity-10 rounded-md p-2">
                                          <span className="text-[var(--color-on-error)] text-[10px] block">
                                            Obligation
                                          </span>
                                          <span className="font-bold text-[var(--color-on-error)]">
                                            BHD
                                            {loan.repayment.totalObligation.toLocaleString()}
                                          </span>
                                        </div>
                                      )}
                                      {loan.repayment?.totalFees && (
                                        <div className="bg-[var(--color-warning)] bg-opacity-10 rounded-md p-2">
                                          <span className="text-[var(--color-on-error)] text-[10px] block">
                                            Fees
                                          </span>
                                          <span className="font-bold text-[var(--color-on-warning)]">
                                            BHD
                                            {loan.repayment.totalFees.toLocaleString()}
                                          </span>
                                        </div>
                                      )}
                                      {loan.costSummary?.totalTaxes && (
                                        <div className="bg-[var(--color-secondary)] bg-opacity-10 rounded-md p-2">
                                          <span className="text-[var(--color-on-error)] text-[10px] block">
                                            Taxes
                                          </span>
                                          <span className="font-bold text-[var(--color-on-secondary)]">
                                            BHD
                                            {loan.costSummary.totalTaxes.toLocaleString()}
                                          </span>
                                        </div>
                                      )}
                                      {loan.costSummary?.effectiveAPR && (
                                        <div className="bg-[var(--color-info)] bg-opacity-10 rounded-md p-2">
                                          <span className="text-[var(--color-on-error)] text-[10px] block">
                                            APR
                                          </span>
                                          <span className="font-bold text-[var(--color-on-info)]">
                                            {loan.costSummary.effectiveAPR.toFixed(
                                              2
                                            )}
                                            %
                                          </span>
                                        </div>
                                      )}
                                      {loan.disbursement && (
                                        <>
                                          <div className="bg-[var(--color-surface)] rounded-md p-2">
                                            <span className="text-[var(--color-on-surface)] opacity-70 text-[10px] block">
                                              Gross
                                            </span>
                                            <span className="font-bold text-[var(--color-on-background)]">
                                              BHD
                                              {(
                                                loan.disbursement
                                                  ?.grossAmount ?? 0
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="bg-[var(--color-success)] bg-opacity-10 rounded-md p-2">
                                          <span className="text-[var(--color-on-error)] text-[10px] block">
                                              Net
                                            </span>
                                            <span className="font-bold text-[var(--color-on-success)]">
                                              BHD
                                              {(
                                                loan.disbursement?.netAmount ??
                                                0
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Loan Info */}
                                <div className="bg-[var(--color-background)] rounded-lg border border-[var(--color-muted)] border-opacity-30 p-3 shadow-sm">
                                  <h6 className="text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <FaInfoCircle className="w-3.5 h-3.5 text-[var(--color-on-surface)] opacity-50" />{" "}
                                    Timeline
                                  </h6>
                                  <div className="grid grid-cols-3 gap-3 text-xs">
                                    <div className="bg-[var(--color-surface)] rounded-md p-2">
                                      <span className="text-[var(--color-on-surface)] opacity-70 text-[10px] block">
                                        Applied
                                      </span>
                                      <span className="font-semibold text-[var(--color-on-background)]">
                                        {formatDate(loan.applicationDate)}
                                      </span>
                                    </div>
                                    <div className="bg-[var(--color-surface)] bg-opacity-10 rounded-md p-2">
                                      <span className="text-[var(--color-on-surface)] text-[10px] block">
                                        Approved
                                      </span>
                                      <span className="font-semibold text-[var(--color-on-background)]">
                                        {loan.approvalDate
                                          ? formatDate(loan.approvalDate)
                                          : "—"}
                                      </span>
                                    </div>
                                    <div className="bg-[var(--color-surface)] bg-opacity-10 rounded-md p-2">
                                      <span className="text-[var(--color-on-surface)] text-[10px] block">
                                        Disbursed
                                      </span>
                                      <span className="font-semibold text-[var(--color-on-background)]">
                                        {loan.disbursementDate
                                          ? formatDate(loan.disbursementDate)
                                          : "—"}
                                      </span>
                                    </div>
                                    {loan.loanDetails && (
                                      <>
                                        <div className="bg-[var(--color-surface)] rounded-md p-2">
                                          <span className="text-[var(--color-on-surface)] opacity-70 text-[10px] block">
                                            Duration
                                          </span>
                                          <span className="font-semibold text-[var(--color-on-background)]">
                                            {loan.loanDetails.durationDays} days
                                          </span>
                                        </div>
                                        <div className="bg-[var(--color-surface)] bg-opacity-10 rounded-md p-2">
                                          <span className="text-[var(--color-on-surface)] text-[10px] block">
                                            Due Date
                                          </span>
                                          <span className="font-semibold text-[var(--color-on-background)]">
                                            {formatDate(
                                              loan.loanDetails.dueDate
                                            )}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                    <div className="bg-[var(--color-surface)] bg-opacity-10 rounded-md p-2">
                                      <span className="text-[var(--color-on-surface)] text-[10px] block">
                                        Closed
                                      </span>
                                      <span className="font-semibold text-[var(--color-on-secondary)]">
                                        {loan.closureDate
                                          ? formatDate(loan.closureDate)
                                          : "—"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Fee Breakdowns */}
                                {loan.repayment?.feeBreakdowns &&
                                  loan.repayment.feeBreakdowns.length > 0 && (
                                    <div className="bg-[var(--color-background)] rounded-lg border border-[var(--color-muted)] border-opacity-30 p-3 shadow-sm">
                                      <h6 className="text-[11px] font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                        <FaReceipt className="w-3.5 h-3.5 text-[var(--color-on-surface)] opacity-50" />{" "}
                                        Fee Breakdown
                                      </h6>
                                      <div className="overflow-hidden rounded-md border border-[var(--color-muted)] border-opacity-30">
                                        <table className="w-full text-[11px]">
                                          <thead className="bg-[var(--color-surface)] bg-opacity-50">
                                            <tr className="text-[var(--color-on-surface)] opacity-70">
                                              <th className="text-left py-2 px-2.5 font-medium">
                                                Type
                                              </th>
                                              <th className="text-right py-2 px-2.5 font-medium">
                                                Base
                                              </th>
                                              <th className="text-right py-2 px-2.5 font-medium">
                                                Tax
                                              </th>
                                              <th className="text-right py-2 px-2.5 font-medium">
                                                Total
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-30">
                                            {loan.repayment.feeBreakdowns.map(
                                              (fee) => (
                                                <tr
                                                  key={fee.id}
                                                  className="hover:bg-[var(--color-surface)] hover:bg-opacity-30"
                                                >
                                                  <td className="py-2 px-2.5 font-medium text-[var(--color-on-background)]">
                                                    {fee.type}
                                                  </td>
                                                  <td className="text-right py-2 px-2.5 text-[var(--color-on-surface)] opacity-70">
                                                    BHD
                                                    {fee.calculationBaseAmount?.toLocaleString() &&
                                                      fee.calculationBaseAmount?.toLocaleString()}
                                                  </td>
                                                  <td className="text-right py-2 px-2.5 text-[var(--color-on-surface)] opacity-70">
                                                    BHD
                                                    {fee.calculationTaxAmount &&
                                                      fee.calculationTaxAmount?.toLocaleString()}
                                                  </td>
                                                  <td className="text-right py-2 px-2.5 font-bold text-[var(--color-on-background)]">
                                                    BHD
                                                    {fee.total &&
                                                      fee.total?.toLocaleString()}
                                                  </td>
                                                </tr>
                                              )
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                {/* Penalties */}
                                {loan.penalties &&
                                  loan.penalties.length > 0 && (
                                    <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border border-red-200/60 p-3 shadow-sm">
                                      <h6 className="text-[11px] font-semibold text-red-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                        <FaExclamationTriangle className="w-3.5 h-3.5" />{" "}
                                        Penalties ({loan.penalties.length})
                                      </h6>
                                      <div className="grid grid-cols-2 gap-2">
                                        {loan.penalties.map((penalty) => (
                                          <div
                                            key={penalty.id}
                                            className="text-xs bg-white rounded-md p-2.5 border border-red-100 shadow-sm"
                                          >
                                            <div className="flex justify-between items-center mb-1.5">
                                              <span className="font-semibold text-red-800">
                                                {penalty.type}
                                              </span>
                                              <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                                {penalty.valueType}
                                              </span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                              <span className="text-red-600">
                                                BHD
                                                {penalty.chargeValue.toLocaleString()}
                                              </span>
                                              <span className="text-red-500">
                                                +Tax: BHD
                                                {penalty.taxChargeValue.toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                {/* Deductions */}
                                {loan.disbursement?.deductions &&
                                  loan.disbursement.deductions.length > 0 && (
                                    <div className="bg-white rounded-lg border border-slate-200/60 p-3 shadow-sm">
                                      <h6 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                        <FaCoins className="w-3.5 h-3.5 text-slate-400" />{" "}
                                        Deductions
                                      </h6>
                                      <div className="overflow-hidden rounded-md border border-slate-100">
                                        <table className="w-full text-[11px]">
                                          <thead className="bg-slate-50">
                                            <tr className="text-slate-500">
                                              <th className="text-left py-2 px-2.5 font-medium">
                                                Type
                                              </th>
                                              <th className="text-right py-2 px-2.5 font-medium">
                                                Base
                                              </th>
                                              <th className="text-right py-2 px-2.5 font-medium">
                                                Tax
                                              </th>
                                              <th className="text-right py-2 px-2.5 font-medium">
                                                Total
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {loan.disbursement.deductions.map(
                                              (d) => (
                                                <tr
                                                  key={d.id}
                                                  className="hover:bg-slate-50/50"
                                                >
                                                  <td className="py-2 px-2.5 font-medium text-slate-700">
                                                    {d.type}
                                                  </td>
                                                  <td className="text-right py-2 px-2.5 text-slate-600">
                                                    BHD
                                                    {(
                                                      d.calculationBaseAmount ??
                                                      0
                                                    ).toLocaleString()}
                                                  </td>
                                                  <td className="text-right py-2 px-2.5 text-slate-600">
                                                    BHD
                                                    {(
                                                      d.calculationTaxAmount ??
                                                      0
                                                    ).toLocaleString()}
                                                  </td>
                                                  <td className="text-right py-2 px-2.5 font-bold text-slate-800">
                                                    BHD
                                                    {(
                                                      d.total ?? 0
                                                    ).toLocaleString()}
                                                  </td>
                                                </tr>
                                              )
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                {/* User Info */}
                                {loan.user && (
                                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200/60 p-3 shadow-sm">
                                    <h6 className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-3">
                                      Customer Details
                                    </h6>
                                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                                      {/* <div className="bg-white/80 rounded-md p-2">
                                        <span className="text-blue-500 text-[10px] block">
                                          Name
                                        </span>
                                        <span className="font-semibold text-slate-800">
                                          {loan.user.userDetails?.firstName}{" "}
                                          {loan.user.userDetails?.lastName}
                                        </span>
                                      </div> */}
                                      <div className="bg-white/80 rounded-md p-2">
                                        <span className="text-blue-500 text-[10px] block">
                                          Phone
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-slate-800">
                                            {loan.user.phoneNumber}
                                          </span>
                                          {loan.id && (
                                            <AcefoneClickToDialButton
                                              userId={loan.userId}
                                              loanId={loan.id}
                                            />
                                          )}
                                        </div>
                                      </div>
                                      <div className="col-span-2 bg-white/80 rounded-md p-2">
                                        <span className="text-blue-500 text-[10px] block">
                                          Email
                                        </span>
                                        <span className="font-semibold text-slate-800">
                                          {loan.user.email}
                                        </span>
                                      </div>
                                      {loan.user.bankAccounts &&
                                        loan.user.bankAccounts.length > 0 && (
                                          <div className="col-span-2 bg-white/80 rounded-md p-2">
                                            <span className="text-blue-500 text-[10px] block">
                                              Bank Account
                                            </span>
                                            {loan.user.bankAccounts
                                              .slice(0, 1)
                                              .map((bank) => (
                                                <span
                                                  key={bank.id}
                                                  className="font-semibold text-slate-800"
                                                >
                                                  {bank.bankName} -{" "}
                                                  {bank.accountNumber}
                                                </span>
                                              ))}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                )}

                                {/* Agreement */}
                                {loan.agreement && (
                                  <div className="bg-[var(--color-background)] rounded-lg border border-[var(--color-muted)] border-opacity-30 p-3 shadow-sm">
                                    <h6 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                      <FaFileAlt className="w-3.5 h-3.5 text-slate-400" />{" "}
                                      Agreement
                                    </h6>
                                    <div className="flex flex-wrap gap-2">
                                      <div className="bg-slate-50 rounded-md px-3 py-1.5 text-xs">
                                        <span className="text-slate-500">
                                          Status:{" "}
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(
                                            loan.agreement.status,
                                            "agreement"
                                          )}`}
                                        >
                                          {loan.agreement.status}
                                        </span>
                                      </div>
                                      <div className="bg-slate-50 rounded-md px-3 py-1.5 text-xs">
                                        <span className="text-slate-500">
                                          Signed:{" "}
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                            loan.agreement.signedByUser
                                              ? "bg-emerald-100 text-emerald-800"
                                              : "bg-red-100 text-red-800"
                                          }`}
                                        >
                                          {loan.agreement.signedByUser
                                            ? "Yes"
                                            : "No"}
                                        </span>
                                      </div>
                                      {loan.agreement.signedAt && (
                                        <div className="bg-slate-50 rounded-md px-3 py-1.5 text-xs">
                                          <span className="text-slate-500">
                                            Date:{" "}
                                          </span>
                                          <span className="font-medium text-slate-700">
                                            {formatDate(
                                              loan.agreement.signedAt
                                            )}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Payment Requests */}
                                {loan.paymentRequests &&
                                  loan.paymentRequests.length > 0 && (
                                    <div className="bg-[var(--color-background)] rounded-lg border border-[var(--color-muted)] border-opacity-30 p-3 shadow-sm col-span-full">
                                      <h6 className="text-[11px] font-semibold text-[var(--color-on-surface)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                        <FaMoneyBillWave className="w-3.5 h-3.5 text-[var(--color-on-surface)]" />{" "}
                                        Payment Requests (
                                        {loan.paymentRequests.length})
                                      </h6>
                                      <div className="overflow-hidden rounded-md  bg-white/80">
                                        <table className="w-full text-[11px]">
                                          <thead className="">
                                            <tr className="text-slate-500">
                                              <th className="text-left py-2 px-2.5 font-medium">
                                                Type
                                              </th>
                                              <th className="text-left py-2 px-2.5 font-medium">
                                                Status
                                              </th>
                                              <th className="text-left py-2 px-2.5 font-medium">
                                                Currency
                                              </th>
                                              <th className="text-left py-2 px-2.5 font-medium">
                                                Created
                                              </th>
                                              <th className="text-left py-2 px-2.5 font-medium">
                                                Transactions
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {loan.paymentRequests.map(
                                              (payment) => (
                                                <tr
                                                  key={payment.id}
                                                  className="hover:bg-slate-50"
                                                >
                                                  <td className="py-2 px-2.5 font-medium text-slate-700">
                                                    {payment.type}
                                                  </td>
                                                  <td className="py-2 px-2.5">
                                                    <span
                                                      className={getStatusColor(
                                                        payment.status,
                                                        "payment"
                                                      )}
                                                    >
                                                      {payment.status}
                                                    </span>
                                                  </td>
                                                  <td className="py-2 px-2.5 text-slate-600">
                                                    {payment.currency}
                                                  </td>
                                                  <td className="py-2 px-2.5 text-slate-600">
                                                    {formatDate(
                                                      payment.createdAt
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-2.5">
                                                    {payment.collectionTransactions &&
                                                      payment
                                                        .collectionTransactions
                                                        .length > 0 && (
                                                        <span className="px-2 py-0.5  text-[var(--color-on-surface)] rounded-full text-[10px] font-medium">
                                                          {
                                                            payment
                                                              .collectionTransactions
                                                              .length
                                                          }{" "}
                                                          txn(s)
                                                        </span>
                                                      )}
                                                  </td>
                                                </tr>
                                              )
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                {/* Comments */}
                                <div className="bg-white rounded-lg border border-slate-200/60 p-3 shadow-sm col-span-full">
                                  <h6 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <FaCommentDots className="w-3.5 h-3.5 text-slate-400" />{" "}
                                    Remarks History
                                  </h6>
                                  <AddRemarksButton
                                    loanId={loan.id}
                                    onOpenModal={openCommentModal}
                                  />

                                  {loadingComments[loan.id] ? (
                                    <div className="flex items-center gap-2 py-4 justify-center text-xs text-slate-500">
                                      <Spinner /> Loading comments...
                                    </div>
                                  ) : loanComments[loan.id] &&
                                    loanComments[loan.id].length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                      {loanComments[loan.id].map((comment) => (
                                        <div
                                          key={comment.id}
                                          className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg text-xs"
                                        >
                                          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0 shadow-sm">
                                            {comment.partnerUser?.name?.charAt(
                                              0
                                            ) || "U"}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                              <span className="font-semibold text-slate-800 truncate">
                                                {comment.partnerUser?.name ||
                                                  "Unknown"}
                                              </span>
                                              <span className="text-[10px] text-slate-400">
                                                {formatDate(comment.createdAt)}
                                              </span>
                                            </div>
                                            <p className="text-slate-600">
                                              {comment.comment}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400 py-4 text-center">
                                      No Remarks yet
                                    </p>
                                  )}
                                </div>

                                {/* Allotted Partners */}
                                {loan.allottedPartners &&
                                  loan.allottedPartners.length > 0 && (
                                    <div className="bg-white rounded-lg border border-slate-200/60 p-3 shadow-sm col-span-full">
                                      <h6 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-3">
                                        Allotted Partners
                                      </h6>
                                      <div className="overflow-hidden rounded-md border border-slate-100">
                                        <table className="w-full text-[11px]">
                                          <thead className="bg-slate-50">
                                            <tr className="text-slate-500">
                                              <th className="text-left py-2 px-2.5 font-medium">
                                                Name
                                              </th>
                                              <th className="text-left py-2 px-2.5 font-medium">
                                                Email
                                              </th>
                                              <th className="text-right py-2 px-2.5 font-medium">
                                                Amount
                                              </th>
                                              <th className="text-right py-2 px-2.5 font-medium">
                                                Date
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {loan.allottedPartners.map(
                                              (partner) => (
                                                <tr
                                                  key={partner.id}
                                                  className="hover:bg-slate-50/50"
                                                >
                                                  <td className="py-2 px-2.5 font-medium text-slate-700">
                                                    {partner.partnerUser.name}
                                                  </td>
                                                  <td className="py-2 px-2.5 text-slate-600">
                                                    {partner.partnerUser.email}
                                                  </td>
                                                  <td className="text-right py-2 px-2.5 font-bold text-emerald-600">
                                                    BHD
                                                    {partner.amount.toLocaleString()}
                                                  </td>
                                                  <td className="text-right py-2 px-2.5 text-slate-600">
                                                    {formatDate(
                                                      partner.allottedAt
                                                    )}
                                                  </td>
                                                </tr>
                                              )
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                {/* Status Flags */}
                                <div className="bg-white rounded-lg border border-slate-200/60 p-3 shadow-sm col-span-full">
                                  <h6 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-3">
                                    Status Flags
                                  </h6>
                                  <div className="flex flex-wrap gap-2">
                                    {isSuperAdmin && (
                                      <span className="px-2.5 py-1 bg-slate-100 rounded-full text-[10px] font-medium text-slate-600">
                                        ID: {loan.id.slice(0, 8)}...
                                      </span>
                                    )}
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${
                                        loan.forceBsaReportByPass
                                          ? "bg-red-100 text-red-700"
                                          : "bg-emerald-100 text-emerald-700"
                                      }`}
                                    >
                                      BSA:{" "}
                                      {loan.forceBsaReportByPass
                                        ? "Bypass"
                                        : "OK"}
                                    </span>
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${
                                        loan.forceCreditReportByPass
                                          ? "bg-red-100 text-red-700"
                                          : "bg-emerald-100 text-emerald-700"
                                      }`}
                                    >
                                      Credit:{" "}
                                      {loan.forceCreditReportByPass
                                        ? "Bypass"
                                        : "OK"}
                                    </span>
                                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
                                      Auth: {loan.paymentAuthorizationStatus}
                                    </span>
                                    {loan.xlsxCount && (
                                      <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium">
                                        {loan.xlsxCount} Doc(s)
                                      </span>
                                    )}
                                    {loan.isMigratedloan && (
                                      <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-medium">
                                        Migrated
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerLoans;
