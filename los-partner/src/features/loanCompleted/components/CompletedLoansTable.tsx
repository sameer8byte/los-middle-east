import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { FiCopy, FiMail } from "react-icons/fi";
import Avatar from "../../../common/ui/avatar";
import { useToast } from "../../../context/toastContext";
import { formatDateWithTime } from "../../../lib/utils";
import {
  Pagination as TablePagination,
  SearchInput,
  ErrorMessage,
} from "../../../common/ui/table";
import { getCompletedLoans } from "../../../shared/services/api/loan.api";
import { Pagination } from "../../../shared/types/pagination";
import { Button } from "../../../common/ui/button";
import { LoanStatusBadge } from "../../../common/ui/LoanStatusBadge";
import { useCustomerNavigator } from "../../../hooks/useViewCustomer";
import { Filters } from "./filters";
import { FilterButton } from "../../../common/common/filterButton";
import { useQueryParams } from "../../../hooks/useQueryParams";
import { AcefoneClickToDialButton } from "../../acefone";
import { Conversion } from "../../../utils/conversion";

interface CompletedLoan {
  id: string;
  formattedLoanId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  loanAmount: number;
  status: "COMPLETED" | "SETTLED" | "WRITE_OFF";
  closureDate: string;
  approvalDate: string;
  disbursementDate: string;
  totalObligation: number;
  lastStatusUpdate: string;
  oldLoanId?: string;
  formattedUserId?: string;
  userId: string;
}

interface CompletedLoansTableProps {
  title: string;
  status: string; // JSON array string like '["COMPLETED"]'
  storageKey: string;
  emptyMessage?: string;
}

export default function CompletedLoansTable({
  title,
  status,
  storageKey,
  emptyMessage = "No loans found",
}: CompletedLoansTableProps) {
  const { brandId } = useParams();
  const { showError, showSuccess } = useToast();
  const { handleView } = useCustomerNavigator();
  const { getQuery } = useQueryParams();

  const [loans, setLoans] = useState<CompletedLoan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Add visibility state for email and phone masking
  const [visibleInfo, setVisibleInfo] = useState<{
    [loanId: string]: {
      email: boolean;
      phone: boolean;
    };
  }>({});

  // Toggle visibility function
  const toggleVisibility = (loanId: string, type: 'email' | 'phone') => {
    setVisibleInfo(prev => ({
      ...prev,
      [loanId]: {
        email: type === 'email' ? !prev[loanId]?.email : prev[loanId]?.email || false,
        phone: type === 'phone' ? !prev[loanId]?.phone : prev[loanId]?.phone || false
      }
    }));
  };

  // Get date filter from query params
  const dateFilter = getQuery("dateFilter") || "";

  const [pagination, setPagination] = useState<Pagination>(() => {
    const savedLimit = localStorage.getItem(`${storageKey}PageSize`);
    const savedPage = localStorage.getItem(`${storageKey}Page`);
    return {
      page: savedPage ? Number(savedPage) : 1,
      limit: savedLimit ? Number(savedLimit) : 10,
      dateFilter: dateFilter,
    };
  });

  const [totalCount, setTotalCount] = useState(0);

  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pagination.limit);
  }, [totalCount, pagination.limit]);

  const fetchLoans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (!brandId) {
      setError("Brand ID is required");
      setIsLoading(false);
      return;
    }
    try {
      const response = await getCompletedLoans(
        brandId,
        {
          page: pagination.page,
          limit: pagination.limit,
          dateFilter: dateFilter || "",
        },
        {
          search: searchTerm || "",
          status: status,
        }
      );
      setLoans(response.data || []);
      setTotalCount(response.pagination?.total || 0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch loans";
      setError(errorMessage);
      showError("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [brandId, pagination, searchTerm, status, showError, dateFilter]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  // Update pagination when dateFilter changes
  useEffect(() => {
    if (dateFilter !== pagination.dateFilter) {
      setPagination((prev) => ({ ...prev, dateFilter, page: 1 }));
    }
  }, [dateFilter]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
    localStorage.setItem(`${storageKey}Page`, String(page));
  };

  const handleLimitChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, page: 1, limit }));
    localStorage.setItem(`${storageKey}PageSize`, String(limit));
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleCopyLoanId = (loanId: string) => {
    navigator.clipboard.writeText(loanId);
    showSuccess("Copied", "Loan ID copied to clipboard");
  };

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Filters Sidebar */}
      <div className="flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <Filters />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {title}{" "}
              <span className="text-gray-500 font-normal">
                ({totalCount})
              </span>
            </h1>
          </div>
          <div className="flex gap-4 items-center">
            <SearchInput
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search by loan ID, customer name, or document number..."
            />
            <Button onClick={fetchLoans} disabled={isLoading}>
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
            <div className="flex items-center gap-2">
              <FilterButton />
            </div>
          </div>
        </div>

        {/* Table Container - Scrollable */}
        <div className="flex-1 overflow-auto min-h-0">
          {error ? (
            <ErrorMessage message={error} />
          ) : (
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                      Customer & Loan Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                      Loan Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                      Closure Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : loans.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    loans.map((loan) => {
                      // Get visibility state for this loan
                      const isEmailVisible = visibleInfo[loan.id]?.email || false;
                      const isPhoneVisible = visibleInfo[loan.id]?.phone || false;

                      return (
                        <tr
                          key={loan.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {/* Merged: Customer & Loan Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <Avatar name={loan.customerName} />
                              <div className="flex flex-col gap-1 min-w-0 flex-1">
                                {/* Customer Name */}
                                <p className="font-semibold text-sm text-gray-900 truncate">
                                  {loan.customerName}
                                </p>

                                {/* Contact Info Row */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  {/* Email with toggle */}
                                  <div className="flex items-center group/email">
                                    <div className="flex items-center gap-1 text-xs text-gray-500 min-w-0">
                                      <FiMail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                      <span className="truncate max-w-[140px]">
                                        {loan.customerEmail
                                          ? isEmailVisible
                                            ? loan.customerEmail
                                            : loan.customerEmail.replace(/(?<=^.).*?(?=@)/g, (match) => 'X'.repeat(match.length))
                                          : "N/A"}
                                      </span>
                                    </div>
                                    {loan.customerEmail && loan.customerEmail !== "N/A" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleVisibility(loan.id, 'email');
                                        }}
                                        className="ml-0.5 p-0.5 hover:bg-gray-100 rounded opacity-0 group-hover/email:opacity-100 transition-opacity flex-shrink-0"
                                        title={isEmailVisible ? "Hide email" : "Show email"}
                                      >
                                        {isEmailVisible ? (
                                          <svg className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                          </svg>
                                        ) : (
                                          <svg className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                        )}
                                      </button>
                                    )}
                                  </div>

                                  {/* Phone with toggle */}
                                  <div className="flex items-center group/phone">
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      {loan.customerPhone && (
                                        <AcefoneClickToDialButton userId={loan.userId}
                                          loanId={loan.id}
                                        />
                                      )}{" "}                                        <span>
                                        {loan.customerPhone
                                          ? isPhoneVisible
                                            ? loan.customerPhone
                                            : loan.customerPhone.replace(/\d(?=\d{4})/g, 'X')
                                          : "N/A"}
                                      </span>
                                    </div>
                                    {loan.customerPhone && loan.customerPhone !== "N/A" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleVisibility(loan.id, 'phone');
                                        }}
                                        className="ml-0.5 p-0.5 hover:bg-gray-100 rounded opacity-0 group-hover/phone:opacity-100 transition-opacity flex-shrink-0"
                                        title={isPhoneVisible ? "Hide phone" : "Show phone"}
                                      >
                                        {isPhoneVisible ? (
                                          <svg className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                          </svg>
                                        ) : (
                                          <svg className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Loan IDs Row */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                  {/* Loan ID */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 uppercase">Loan:</span>
                                    <span className="text-xs font-medium text-blue-600">{loan.formattedLoanId}</span>
                                    <FiCopy
                                      className="w-3 h-3 cursor-pointer text-gray-400 hover:text-blue-600"
                                      onClick={() => handleCopyLoanId(loan.formattedLoanId)}
                                    />
                                  </div>

                                  {/* User ID */}
                                  {loan.formattedUserId && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-gray-400 uppercase">User:</span>
                                      <span className="text-xs text-gray-600">{loan.formattedUserId}</span>
                                    </div>
                                  )}

                                  {/* Old Loan ID */}
                                  {loan.oldLoanId && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-gray-400 uppercase">Old:</span>
                                      <span className="text-xs text-gray-500">{loan.oldLoanId}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-gray-900">
{Conversion.formatCurrency(loan.loanAmount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <LoanStatusBadge status={loan.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {loan.closureDate
                              ? formatDateWithTime(new Date(loan.closureDate))
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (loan.userId && brandId) {
                                  handleView(loan.userId, brandId, "completed");
                                }
                              }}
                              disabled={!loan.userId || !brandId}
                              variant="outline"
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination - Fixed at bottom */}
        {!isLoading && !error && (
          <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
            <TablePagination
              currentPage={pagination.page}
              totalPages={totalPages}
              pageSize={pagination.limit}
              onPageChange={handlePageChange}
              onPageSizeChange={handleLimitChange}
              totalCount={totalCount}
            />
          </div>
        )}
      </div>
    </div>
  );
}