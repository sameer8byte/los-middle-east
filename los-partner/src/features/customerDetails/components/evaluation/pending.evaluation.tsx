import { useState, useEffect } from "react";
import { FaClock, FaCheckCircle, FaTimesCircle, FaMoneyBillWave, FaFileAlt, FaEye } from "react-icons/fa";
 import { Spinner } from "../../../../common/ui/spinner";
import { LoanStatusEnum } from "../../../../constant/enum";
import { useQueryParams } from "../../../../hooks/useQueryParams";
 
 
import { CreateRepaymentTimeline } from "../repayment/createRepaymentTimeline";
 import { UpdateLoanAmount } from "../updateLoanAmount";
import { LoanEvaluation } from "./create.evaluation";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getCustomerLoans } from "../../../../shared/services/api/customer.api";
import { upsertEvaluation } from "../../../../shared/services/api/evaluation.api";
import { Loan } from "../../../../shared/types/loan";
import { useAppDispatch } from "../../../../shared/redux/store";
import { updateLoanData } from "../../../../shared/redux/slices/user";
import { LoanStatusBadge } from "../../../../common/ui/LoanStatusBadge";

export function PendingEvaluate() {
  const { setQuery, getQuery } = useQueryParams();

  const evaluationId = getQuery("evaluationId");

  const dispatch = useAppDispatch();

  const createRepaymentTimelineLoanId = getQuery(
    "createRepaymentTimelineLoanId"
  );

  const updateLoanId = getQuery("updateLoanId");
  const { brandId, customerId } = useParams();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState<string | null>(
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
  }, [brandId, customerId, dispatch]);

  const fetchEvaluation = async (
    userId: string,
    brandId: string,
    loanId: string
  ) => {
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
  };

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
 
 toast.success(statusMessage)
    // Update Redux store
    dispatch(
      updateLoanData(
        loans.map((loan) =>
          loan.id === updatedLoan.id ? { ...loan, ...updatedLoan } : loan
        )
      )
    );
  };

  const getStatusIcon = (status: LoanStatusEnum) => {
    switch (status) {
      case LoanStatusEnum.PENDING:
        return <FaClock className="w-4 h-4 text-[var(--color-warning)]" />;
      case LoanStatusEnum.APPROVED:
      case LoanStatusEnum.CREDIT_EXECUTIVE_APPROVED:
      case LoanStatusEnum.SANCTION_MANAGER_APPROVED:
        return <FaCheckCircle className="w-4 h-4 text-[var(--color-on-success)]" />;
      case LoanStatusEnum.REJECTED:
        return <FaTimesCircle className="w-4 h-4 text-[var(--color-on-error)]" />;
      case LoanStatusEnum.DISBURSED:
      case LoanStatusEnum.ACTIVE:
        return <FaMoneyBillWave className="w-4 h-4 text-[var(--color-on-primary)]" />;
      default:
        return <FaFileAlt className="w-4 h-4 text-[var(--color-on-surface)] opacity-70" />;
    }
  };

  const filteredLoans = loans.filter((loan) => {
    return loan.status === LoanStatusEnum.PENDING;
  });

  return (
    <div className="space-y-6">
      {updateLoanId && <UpdateLoanAmount />}
      {createRepaymentTimelineLoanId && <CreateRepaymentTimeline />}
      {evaluationId && loan && (
        <LoanEvaluation loan={loan} onLoanStatusUpdate={handleLoanStatusUpdate} />
      )}



      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-muted)] border-opacity-20 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-muted)] border-opacity-20 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-on-background)]">
                Pending Loan Applications
              </h3>
              <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
                {isLoading
                  ? "Loading..."
                  : `${filteredLoans.length} application${
                      filteredLoans.length !== 1 ? "s" : ""
                    } found`}
              </p>
            </div>
            {!isLoading && filteredLoans.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-on-surface)] opacity-70">
                <FaFileAlt className="w-4 h-4" />
                <span>Total: {filteredLoans.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            /* Enhanced Loading State */
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <Spinner />
                  <p className="text-sm text-[var(--color-on-surface)] opacity-70">
                    Loading loan applications...
                  </p>
                </div>
              </div>
              {[...Array(3)].map((_:any, idx) => (
                <div
                  key={idx}
                  className="animate-pulse flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg border"
                >
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-[var(--color-muted)] bg-opacity-30 rounded w-1/4"></div>
                    <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded w-1/3"></div>
                    <div className="h-3 bg-[var(--color-muted)] bg-opacity-30 rounded w-1/5"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-8 bg-[var(--color-muted)] bg-opacity-30 rounded w-24"></div>
                    <div className="h-6 bg-[var(--color-muted)] bg-opacity-30 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredLoans.length === 0 ? (
            /* Enhanced Empty State */
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-[var(--color-surface)] rounded-full flex items-center justify-center mb-6">
                <FaFileAlt className="w-10 h-10 text-[var(--color-on-surface)] opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-[var(--color-on-background)] mb-2">
                No loan applications found
              </h3>
              <p className="text-[var(--color-on-surface)] opacity-70 max-w-sm mx-auto">
                There are no pending loan applications for this customer.
              </p>
            </div>
          ) : (
            /* Enhanced Table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-muted)] border-opacity-30">
                    {[
                      {
                        key: "id",
                        label: "Loan ID",
                        icon: <FaFileAlt className="w-3 h-3" />,
                      },
                      {
                        key: "amount",
                        label: "Amount",
                        icon: <FaMoneyBillWave className="w-3 h-3" />,
                      },
                      {
                        key: "status",
                        label: "Status",
                        icon: <FaClock className="w-3 h-3" />,
                      },
                      { key: "action", label: "Action", icon: null },
                    ].map((header) => (
                      <th
                        key={header.key}
                        className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-on-surface)] opacity-70 uppercase tracking-wider"
                      >
                        <div className="flex items-center gap-2">
                          {header.icon}
                          {header.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLoans.map((loan, index) => (
                    <tr
                      key={loan.id}
                      className={`
                        transition-all duration-300 hover:bg-[var(--color-background)]
                  
                        ${index % 2 === 0 ? "bg-white" : "bg-[var(--color-background)]/30"}
                      `}
                    >
                      {/* Loan ID */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(loan.status)}
                          <div className="text-sm font-medium text-[var(--color-on-background)]">
                            {loan.formattedLoanId || "-"}
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-[var(--color-on-background)]">
                          ₹{loan.amount.toLocaleString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <LoanStatusBadge status={loan.status} />
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setLoan(loan);
                            fetchEvaluation(
                              loan.userId,
                              brandId || "",
                              loan.id
                            );
                          }}
                          disabled={evaluationLoading === loan.id}
                          className={`
                            flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl 
                            transition-all duration-200 shadow-sm border
                            ${
                              evaluationLoading === loan.id
                                ? "bg-[var(--color-surface)] text-[var(--color-on-surface)] opacity-70 border-[var(--color-muted)] border-opacity-30 cursor-not-allowed"
                                : "bg-[var(--color-primary)] text-white border-blue-600 hover:bg-[var(--color-primary-hover)] hover:shadow-md transform hover:-translate-y-0.5"
                            }
                          `}
                        >
                          {evaluationLoading === loan.id ? (
                            <>
                              <Spinner theme="light" />
                              <span>Evaluating...</span>
                            </>
                          ) : (
                            <>
                              <FaEye className="w-4 h-4" />
                              <span>Evaluate</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PendingEvaluate;