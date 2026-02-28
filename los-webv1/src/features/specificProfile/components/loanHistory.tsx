import React, { useEffect, useState } from "react";
import {
  getLoans,
  postCurrentRepayment,
} from "../../../services/api/loans.api";
import { useAppSelector } from "../../../redux/store";
import {
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaMoneyBillAlt,
  FaCalendarAlt,
  FaInfoCircle,
  FaChevronRight,
  FaSpinner,
} from "react-icons/fa";
import dayjs from "dayjs";
import { Loan, LoanRepaymentCalculationResponse } from "../../../types/loans";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { VALID_REPAYMENT_STATUS } from "../../../constant";
import { LoanPayNow } from "./loanPayNow";
import { LoanDetails } from "./loanDetails";
import { LoanStatusEnum } from "../../../constant/enum";
import { PartialRepaymentDetails } from "./partialRepaymentDetails";

export function LoanHistory() {
  const { getQuery, removeQuery, setQuery } = useQueryParams();
  const payNowLoanId = getQuery("payNowLoanId");

  const partialPaymentLoanId = getQuery("partialPaymentLoanId");

  const userData = useAppSelector((state) => state.user);
  const [paymentSummary, setPaymentSummary] =
    useState<LoanRepaymentCalculationResponse | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentSummaryLoading, setPaymentSummaryLoading] = useState(false);
  const [loadingLoanId, setLoadingLoanId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLoanHistory = async () => {
      try {
        const response = await getLoans(userData.user.id);
        setLoans(response || []);
      } catch (error) {
        console.error("Error fetching loans:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLoanHistory();
  }, [userData.user.id]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      approved: {
        icon: <FaCheckCircle className="w-4 h-4" />,
        color: "bg-green-100 text-green-800 border-green-200",
      },
      pending: {
        icon: <FaClock className="w-4 h-4" />,
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      rejected: {
        icon: <FaTimesCircle className="w-4 h-4" />,
        color: "bg-red-100 text-red-800 border-red-200",
      },
      default: {
        icon: <FaMoneyBillAlt className="w-4 h-4" />,
        color: "bg-blue-100 text-blue-800 border-blue-200",
      },
    };

    const { icon, color } =
      statusMap[status.toLowerCase() as keyof typeof statusMap] ||
      statusMap.default;

    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${color}`}
      >
        {icon}
        <span className="text-sm font-medium capitalize">
          {status.toLowerCase()}
        </span>
      </div>
    );
  };

  // Improved loading component
  const LoadingSpinner = ({
    size = "default",
  }: {
    size?: "small" | "default" | "large";
  }) => {
    const sizeClasses = {
      small: "w-4 h-4",
      default: "w-6 h-6",
      large: "w-8 h-8",
    };

    return (
      <div className="flex items-center justify-center">
        <FaSpinner
          className={`${sizeClasses[size]} animate-spin text-primary`}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full mx-auto p-6 bg-white rounded-brand shadow-md">
        <div className="animate-pulse">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded-md w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded-md w-80"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-200 rounded-brand p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                  <div className="h-4 bg-gray-200 rounded-md w-20"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded-md w-32 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded-md w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handlePaymentSummary = async (loanId: string) => {
    if (!loanId) return;
    try {
      setLoadingLoanId(loanId);
      setPaymentSummaryLoading(true);
      const response = await postCurrentRepayment(userData.user.id, loanId);
      if (response) {
        setQuery("payNowLoanId", loanId);
        setPaymentSummary(response);
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      // You might want to add error handling here
    } finally {
      setPaymentSummaryLoading(false);
      setLoadingLoanId(null);
    }
  };

  type ActionButtonProps = {
    loan: Loan;
    isRepayment?: boolean;
  };

  const ActionButton = ({ loan, isRepayment = false }: ActionButtonProps) => {
    const isLoading = loadingLoanId === loan.id;

    // Safe guard: if loan or paymentRequests is missing
    if (!loan || !Array.isArray(loan.paymentRequests)) {
      return <div className="text-red-500">Invalid loan data</div>;
    }

    // Try to find a successful or pending collection
    const paymentCollection = loan.paymentRequests
      .find((pr) => pr?.type === "COLLECTION")
      ?.collectionTransactions?.find(
        (tx) =>
          tx?.status === "SUCCESS" &&
          tx?.opsApprovalStatus === "PENDING" &&
          tx?.method === "PAYTERNING"
      );

    // If there's a pending or successful transaction, show info
    if (paymentCollection) {
      return (
        <div className="text-green-600 text-sm font-medium">
          Payment completed! We’re now verifying it. Once approved, you will
          receive a confirmation email and a no-dues certificate.{" "}
        </div>
      );
    }

    const buttonText = isRepayment ? "Pay Now" : "Details";

    const handleClick = () => {
      if (isRepayment) {
        removeQuery("loanId");
        handlePaymentSummary(loan.id);
      } else {
        setQuery("loanId", loan.id);
      }
    };

    return (
      <button
        onClick={handleClick}
        disabled={isLoading || paymentSummaryLoading}
        aria-label={`View ${buttonText.toLowerCase()} for loan ${loan.id}`}
        className={`flex items-center justify-center sm:justify-start gap-2 sm:gap-3 text-base sm:text-sm font-semibold px-4 sm:px-0 py-3 sm:py-0 rounded-xl sm:rounded-none transition-all duration-300 ease-out
    ${
      isLoading || paymentSummaryLoading
        ? "text-gray-400 bg-gray-100 cursor-not-allowed"
        : "text-primary hover:text-primary-hover hover:translate-x-1 active:scale-95"
    }`}
      >
        {isLoading ? (
          <>
            <LoadingSpinner size="small" />
            <span className="text-sm sm:text-base">Loading...</span>
          </>
        ) : (
          <>
            <span className="tracking-wide">{buttonText}</span>
            <FaChevronRight className="w-4 h-4 sm:w-3 sm:h-3 transition-transform duration-300 group-hover:translate-x-1" />
          </>
        )}
      </button>
    );
  };

  return (
    <div>
      {!!paymentSummary && payNowLoanId && (
        <LoanPayNow
          paymentSummary={paymentSummary}
          setPaymentSummary={setPaymentSummary}
        />
      )}
      {partialPaymentLoanId && (
        <PartialRepaymentDetails loanId={partialPaymentLoanId} />
      )}
      {getQuery("loanId") && <LoanDetails />}
      <div className="w-full mx-auto p-6 bg-white rounded-brand shadow-md hover:shadow-lg transition-shadow">
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-on-surface">Loan History</h1>
            <p className="text-secondary mt-2 text-lg">
              Review your current and past loan applications
            </p>
          </div>

          {loans.length > 0 ? (
            <>
              <div className="bg-background rounded-brand shadow-sm overflow-hidden border border-secondary">
                {/* Desktop Table */}
                <table className="w-full hidden md:table">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      {[
                        "Loan ID",
                        "Status",
                        "Amount",
                        "Purpose",
                        "Application Date",
                        "Actions",
                      ].map((header) => (
                        <th
                          key={header}
                          className="py-5 px-6 text-left text-sm font-semibold text-secondary uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary">
                    {loans.map((loan) => (
                      <React.Fragment key={loan.id}>
                        <tr className="hover:bg-gray-50 transition-colors group">
                          <td className="py-5 px-6 font-medium text-on-surface">
                            <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {loan.formattedLoanId}
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            {getStatusBadge(loan.status)}
                          </td>
                          <td className="py-5 px-6 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold">
                                {loan.amount.toLocaleString()}
                              </span>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-secondary max-w-xs">
                            <div className="truncate" title={loan.purpose}>
                              {loan.purpose}
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex items-center gap-2 text-secondary">
                              <FaCalendarAlt className="text-secondary" />
                              <span className="font-medium">
                                {dayjs(loan.applicationDate).format(
                                  "DD MMM YYYY"
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <ActionButton
                              loan={loan}
                              isRepayment={VALID_REPAYMENT_STATUS.includes(
                                loan?.status
                              )}
                            />
                          </td>
                        </tr>

                        {/* Partial Payment Row - Only shows for partially paid loans */}
                        {loan.status === LoanStatusEnum.PARTIALLY_PAID && (
                          <tr className="bg-yellow-50">
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-3 text-yellow-800">
                                <div className="w-1 h-8 bg-yellow-400 rounded"></div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    Due payment:
                                  </span>
                                  <button
                                    onClick={() => {
                                      setQuery("partialPaymentLoanId", loan.id);
                                    }}
                                    className="text-sm underline font-medium hover:text-yellow-900 transition-colors"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-secondary">
                  {loans.map((loan) => (
                    <div
                      key={loan.id}
                      className="p-5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        {getStatusBadge(loan.status)}
                        <div className="flex items-center gap-2 text-sm text-secondary">
                          <FaCalendarAlt className="text-secondary" />
                          <span className="font-medium">
                            {dayjs(loan.applicationDate).format("DD MMM YYYY")}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit mb-2">
                          {loan.formattedLoanId}
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl font-bold text-on-surface">
                            {loan.amount.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-secondary line-clamp-2">
                          {loan.purpose}
                        </p>
                      </div>

                      {/* Partial Payment Alert for Mobile */}
                      {loan.status === LoanStatusEnum.PARTIALLY_PAID && (
                        <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                          <div className="flex items-center gap-2 text-yellow-800">
                            <span className="text-sm font-medium">
                              Partial payment detected:
                            </span>
                            <button
                              onClick={() => {
                                setQuery("partialPaymentLoanId", loan.id);
                              }}
                              className="text-sm underline font-medium hover:text-yellow-900 transition-colors"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t border-gray-200">
                        <ActionButton
                          loan={loan}
                          isRepayment={VALID_REPAYMENT_STATUS.includes(
                            loan?.status
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 text-sm flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-on-surface p-4 rounded-brand border border-blue-200">
                <FaInfoCircle className="text-blue-600 flex-shrink-0" />
                <span>
                  <strong>Last updated:</strong>{" "}
                  {dayjs().format("DD MMM YYYY HH:mm")} •
                  <span className="ml-1">Updates every 15 minutes</span>
                </span>
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-brand border border-secondary">
              <div className="max-w-md mx-auto">
                <div className="bg-white rounded-full p-6 w-24 h-24 mx-auto mb-6 shadow-lg">
                  <FaMoneyBillAlt className="text-4xl text-gray-400 mx-auto" />
                </div>
                <h3 className="text-2xl font-semibold text-on-surface mb-3">
                  No Loan History Found
                </h3>
                <p className="text-secondary mb-8 text-lg">
                  You haven't applied for any loans yet. Start your first
                  application to see it here.
                </p>
                <a
                  href="/"
                  className="inline-flex items-center gap-3 px-8 py-3 bg-primary text-on-primary font-semibold rounded-brand hover:bg-primary-hover transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Apply for Loan
                  <FaChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
