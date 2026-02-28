import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { HiOutlineUser } from "react-icons/hi";
import { CgSpinner } from "react-icons/cg";
import { SearchInput } from "../../common/ui/table";
import { useToast } from "../../context/toastContext";
import { FiCopy } from "react-icons/fi";

import {
  getUserReminders,
  getReminderAuditLogs,
  createUserReminder,
} from "../../shared/services/api/reminder.api";
import { ColumnVisibilityDropdown } from "../../common/ui/columnVisibilityDropdown";
import { MatrixGraph } from "./components/matrixGraph";
import { FaAngleDown } from "react-icons/fa";

const STEP_LABELS: Record<number, string> = {
  1: "Phone Verification",
  2: "Email Verification",
  3: "Loan Application",
  4: "Current Status",
  5: "KYC",
  6: "Personal Info",
  7: "Bank Details",
  8: "Employment Info",
  9: "Selfie",
  10: "Address Verification",
  11: "Review",
  12: "Loans",
};

interface UserReminder {
  id: string;
  user_id: string;
  channel: string;
  template_code: string;
  payload: any;
  scheduled_at: string;
  status: string;
  retry_count: number;
  provider_message_id: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  loan_id?: string | null;
  read_at?: string | null;
  send_at?: string | null;
  users: {
    id: string;
    formattedUserId: string;
    phoneNumber: string;
    email: string;
    onboardingStep?: number;
    userDetails: {
      firstName: string;
      middleName?: string;
      lastName: string;
    };
  };
}

interface FilterState {
  channel: string;
  status: string;
  createdAtFrom: string;
  createdAtTo: string;
  scheduledFrom: string;
  scheduledTo: string;
}

interface FormState {
  template: string;
  channel: string;
  scheduledAt: string;
  providerMessageId: string;
}

const RemindersComponent = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const [reminders, setReminders] = useState<UserReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { showError, showSuccess } = useToast();
  const limit = 10;
  const searchRef = useRef<string>("");
  
  // Consolidated filter state
  const [filters, setFilters] = useState<FilterState>({
    channel: "",
    status: "",
    createdAtFrom: "",
    createdAtTo: "",
    scheduledFrom: "",
    scheduledTo: "",
  });

  // UI state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<UserReminder | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [visibleFilters, setVisibleFilters] = useState<string[]>(["channel", "status"]);
  const [expandedReminders, setExpandedReminders] = useState<Set<string>>(new Set());
  const [progressionData, setProgressionData] = useState<Record<string, number>>({});

  // Form state
  const [formState, setFormState] = useState<FormState>({
    template: "",
    channel: "",
    scheduledAt: "",
    providerMessageId: "",
  });

  const fetchReminders = useCallback(async () => {
    if (!brandId) return;
    try {
      setLoading(true);
      const { data } = await getUserReminders(brandId, {
        page,
        limit,
        search: searchRef.current.trim() || undefined,
        channel: filters.channel || undefined,
        status: filters.status || undefined,
        createdAtFrom: filters.createdAtFrom || undefined,
        createdAtTo: filters.createdAtTo || undefined,
        scheduledFrom: filters.scheduledFrom || undefined,
        scheduledTo: filters.scheduledTo || undefined,
      });
      setReminders(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (error: unknown) {
      console.error("Failed to load reminders:", error);
      showError("Error", "Failed to load reminders");
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [brandId, page, filters, showError]);

  useEffect(() => {
    searchRef.current = searchQuery;
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (brandId) {
        fetchReminders();
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filters, brandId, fetchReminders]);


  const getStepNumberFromLabel = useCallback((label: string): number | null => {
    // eslint-disable-next-line unicorn/prefer-string-replace-all
    const normalizedLabel = label.replace(/\s+/g, '').toLowerCase();
    const entry = Object.entries(STEP_LABELS).find(([_, value]) => 
      // eslint-disable-next-line unicorn/prefer-string-replace-all
      value.replace(/\s+/g, '').toLowerCase() === normalizedLabel
    );
    return entry ? Number.parseInt(entry[0], 10) : null;
  }, []);

  const getStatusBadgeClass = useCallback((status: string): string => {
    if (status === "COMPLETED" || status === "SUCCESS") {
      return "bg-green-100 text-green-800";
    }
    if (status === "IN_PROGRESS") {
      return "bg-blue-100 text-blue-800";
    }
    return "bg-yellow-100 text-yellow-800";
  }, []);

  const calculateProgressionFromAuditLogs = useCallback(async (reminderId: string, onboardingStep: number) => {
    if (!brandId) return 0;
    try {
      const logs = await getReminderAuditLogs(brandId, reminderId);
      const processedSuccess = logs
        .filter((log: any) => log.event === "PROCESSED_SUCCESS")
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      if (processedSuccess.length > 0 && processedSuccess[0].metadata?.type) {
        const reminderStepNumber = getStepNumberFromLabel(processedSuccess[0].metadata.type);
        if (reminderStepNumber) {
          return onboardingStep - reminderStepNumber;
        }
      }
    } catch (error: unknown) {
      console.error("Error calculating progression:", error);
    }
    return 0;
  }, [brandId, getStepNumberFromLabel]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess("Copied", text);
  };

  const fetchAuditLogs = useCallback(
    async (reminderId: string) => {
      if (!brandId) return;
      try {
        setLoadingAudit(true);
        const data = await getReminderAuditLogs(brandId, reminderId);
        setAuditLogs(data || []);
      } catch (error: unknown) {
        console.error("Failed to load audit logs:", error);
        showError("Error", "Failed to load audit logs");
        setAuditLogs([]);
      } finally {
        setLoadingAudit(false);
      }
    },
    [brandId, showError],
  );

  const handleReminderClick = async (reminder: UserReminder) => {
    setSelectedReminder(reminder);
    fetchAuditLogs(reminder.id);
    
    if (reminder.users.onboardingStep && !(reminder.id in progressionData)) {
      const progression = await calculateProgressionFromAuditLogs(
        reminder.id,
        reminder.users.onboardingStep
      );
      setProgressionData(prev => ({ ...prev, [reminder.id]: progression }));
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId || !selectedUserId) return;

    // Validate that WhatsApp channel is mandatory
    if (formState.channel !== "WHATSAPP") {
      showError("Error", "WhatsApp channel is mandatory");
      return;
    }

    setSubmitting(true);
    try {
      await createUserReminder(brandId, {
        userId: selectedUserId,
        channel: formState.channel,
        templateCode: formState.template,
        scheduledAt: formState.scheduledAt,
        providerMessageId: formState.providerMessageId,
        payload: {},
      });
      showSuccess("Success", "Reminder created successfully");
      setShowCreateForm(false);
      setFormState({ template: "", channel: "", scheduledAt: "", providerMessageId: "" });
      fetchReminders();
    } catch (error: any) {
      showError(
        "Error",
        error.response?.data?.message || "Failed to create reminder",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex h-screen">
        <div className="w-96 border-r border-gray-200 flex flex-col bg-gray-50">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-bold">User Reminders ({total})</h2>
          </div>

          <div className="p-4 border-b flex flex-col gap-2 border-gray-200 bg-white">
            <div className="flex gap-2 items-center">
              <SearchInput
                placeholder="Search by user ID, name, template..."
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery("")}
              />
              <ColumnVisibilityDropdown
                columns={[
                  { key: "channel", label: "Channel" },
                  { key: "status", label: "Status" },
                  { key: "createdAt", label: "Created At" },
                  { key: "scheduledAt", label: "Scheduled At" },
                ]}
                visibleColumns={visibleFilters}
                setVisibleColumns={setVisibleFilters}
              />
            </div>
            {!loading && searchQuery.trim() && (
              <button
                onClick={() => {
                  setShowCreateForm(true);
                  setSelectedReminder(null);
                  setSelectedUserId(
                    reminders.length > 0
                      ? reminders[0].user_id
                      : searchQuery.trim(),
                  );
                }}
                className="w-full px-4 py-2 mt-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
              >
                Create Reminder for{" "}
                {reminders.length > 0
                  ? reminders[0].users.formattedUserId
                  : searchQuery.trim()}
              </button>
            )}
          </div>
          {visibleFilters.length > 0 && (
            <div className="p-4 border-b border-gray-200 bg-white">
              {(visibleFilters.includes("channel") || visibleFilters.includes("status")) && (
                <div className="flex gap-2 ">
                  {visibleFilters.includes("channel") && (
                    <div className="flex-1">
                      <label htmlFor="channel-select" className="text-xs font-medium text-gray-700 mb-2 block">
                        Channel
                      </label>
                      <select
                        id="channel-select"
                        value={filters.channel}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, channel: e.target.value }));
                          setPage(1);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Channels</option>
                        <option value="SMS">SMS</option>
                        <option value="EMAIL">Email</option>
                        <option value="WHATSAPP">WhatsApp</option>
                      </select>
                    </div>
                  )}

                  {visibleFilters.includes("status") && (
                    <div className="flex-1">
                      <label htmlFor="status-select" className="text-xs font-medium text-gray-700 mb-2 block">
                        Status
                      </label>
                      <select
                        id="status-select"
                        value={filters.status}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, status: e.target.value }));
                          setPage(1);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Statuses</option>
                        <option value="SUCCESS">Success</option>
                        <option value="PENDING">Pending</option>
                        <option value="FAILED">Failed</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {visibleFilters.includes("createdAt") && (
                  <div>
                    <label htmlFor="created-from" className="text-xs font-medium text-gray-700 mb-2 block">
                      Created At Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="created-from"
                        type="date"
                        value={filters.createdAtFrom}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, createdAtFrom: e.target.value }));
                          setPage(1);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="From"
                      />
                      <input
                        id="created-to"
                        type="date"
                        value={filters.createdAtTo}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, createdAtTo: e.target.value }));
                          setPage(1);
                        }}
                        min={filters.createdAtFrom}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="To"
                      />
                    </div>
                  </div>
                )}

                {visibleFilters.includes("scheduledAt") && (
                  <div>
                    <label htmlFor="scheduled-from" className="text-xs font-medium text-gray-700 mb-2 block">
                      Scheduled At Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="scheduled-from"
                        type="date"
                        value={filters.scheduledFrom}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, scheduledFrom: e.target.value }));
                          setPage(1);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="From"
                      />
                      <input
                        id="scheduled-to"
                        type="date"
                        value={filters.scheduledTo}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, scheduledTo: e.target.value }));
                          setPage(1);
                        }}
                        min={filters.scheduledFrom}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="To"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center p-8">
              <CgSpinner className="animate-spin text-blue-600 text-2xl" />
            </div>
          )}

          {!loading && reminders.length > 0 && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {reminders.map((r) => {
                    const stepsProgressed = progressionData[r.id] || 0;

                  const hasProgressed = stepsProgressed > 0;
                  const isExpanded = expandedReminders.has(r.id);

                  return (
                    <button
                      key={r.id}
                      onClick={() => handleReminderClick(r)}
                      type="button"
                      className={`w-full text-left border rounded-lg p-4 cursor-pointer hover:shadow-md transition ${
                        hasProgressed ? "bg-green-50" : "bg-white"
                      } ${
                        selectedReminder?.id === r.id
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-gray-200"
                      }`}
                    >
                      {/* Line 1: Loan step and status */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">{r.template_code}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(r.status)}`}
                        >
                          {r.status}
                        </span>
                      </div>

                      {/* Line 2: Name and user ID with copy */}
                      <div className="flex items-center gap-1 mb-2 mt-2">
                        <p className="text-xs text-gray-600">
                          {[
                            r.users.userDetails.firstName,
                            r.users.userDetails.middleName,
                            r.users.userDetails.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(r.users.formattedUserId);
                          }}
                          className="ml-2 font-mono flex items-center gap-1 hover:text-blue-600 text-xs"
                        >
                          {r.users.formattedUserId}
                          <FiCopy className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line 3: Channel, Progression status and angle icon */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-700">{r.channel}</span>
                          {hasProgressed && (
                            <span className="text-xs font-medium text-green-700">
                              • ✓ Progressed {stepsProgressed} steps
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedReminders(prev => {
                              const next = new Set(prev);
                              if (next.has(r.id)) next.delete(r.id);
                              else next.add(r.id);
                              return next;
                            });
                          }}
                          className="text-gray-600 hover:text-gray-700 cursor-pointer transition-transform duration-300"
                        >
                          <div className={`transition-transform duration-300 ${
                            isExpanded ? "rotate-180" : "rotate-0"
                          }`}>
                            <FaAngleDown className="w-5 h-5"/>
                          </div>
                        </button>
                      </div>

                      {/* Expanded details */}
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      }`}>
                        <div className="mt-3 pt-3 border-t space-y-2 text-xs">
                          <div>
                            <span className="text-gray-500">Phone:</span>
                            <span className="ml-2">{r.users.phoneNumber}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-500">Email:</span>
                            <span className="ml-2 truncate block">{r.users.email}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Scheduled:</span>
                            <span className="ml-2">{new Date(r.scheduled_at).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Retry:</span>
                            <span className="ml-2">{r.retry_count}</span>
                          </div>
                        </div>
                      </div>

                      {r.last_error && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-red-600">{r.last_error}</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="sticky bottom-0 p-3 border-t border-gray-200 bg-white">
                <div className="flex items-center justify-between text-xs">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2 py-1 border rounded disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span>
                    {page} / {Math.ceil(total / limit) || 1}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= Math.ceil(total / limit)}
                    className="px-2 py-1 border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}

          {!loading && reminders.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 p-8">
              <HiOutlineUser className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No reminders</p>
            </div>
          )}
        </div>

        <div className="flex-1 bg-white p-6 overflow-y-auto">
          {selectedReminder ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Audit Logs</h2>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Events</option>
                  <option value="DISPATCHED_TO_SQS">Dispatched to SQS</option>
                  <option value="PROCESSED_SUCCESS">Processed Success</option>
                </select>
              </div>

              {loadingAudit && (
                <div className="flex justify-center p-8">
                  <CgSpinner className="animate-spin text-blue-600 text-2xl" />
                </div>
              )}

              {!loadingAudit && auditLogs.length > 0 && (
                <div className="border border-[var(--color-muted)] border-opacity-20 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[var(--secondary)] bg-opacity-10 border-b border-[var(--color-muted)] border-opacity-20 ">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-semibold text-[var(--color-on-background)] uppercase">
                          Event
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-semibold text-[var(--color-on-background)] uppercase">
                          Metadata
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-semibold text-[var(--color-on-background)] uppercase">
                          Created At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-muted)] divide-opacity-20">
                      {(selectedEvent
                        ? auditLogs.filter((log) => log.event === selectedEvent)
                        : auditLogs
                      ).map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-[var(--color-muted)] hover:bg-opacity-5"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-[var(--color-on-background)]">
                            {log.event}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--color-on-surface)] opacity-70">
                            {log.metadata &&
                              Object.entries(log.metadata).map(
                                ([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium">{key}:</span>{" "}
                                    {String(value)}
                                  </div>
                                ),
                              )}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--color-on-surface)] opacity-70">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loadingAudit && auditLogs.length === 0 && (
                <p className="text-sm text-gray-500">No audit logs found</p>
              )}
            </div>
          ) : (
            <MatrixGraph/>
          )}
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Create Reminder</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div>
                <label htmlFor="channel-form" className="block text-sm font-medium mb-1">
                  Channel
                </label>
                <select
                  id="channel-form"
                  value={formState.channel}
                  onChange={(e) => setFormState(prev => ({ ...prev, channel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  required
                >
                  <option value="">Select channel</option>
                  <option value="SMS">SMS</option>
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>
              <div>
                <label htmlFor="template-form" className="block text-sm font-medium mb-1">
                  Template
                </label>
                <select
                  id="template-form"
                  value={formState.template}
                  onChange={(e) => setFormState(prev => ({ ...prev, template: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  required
                >
                  <option value="">Select template</option>
                  <option value="PhoneVerification">Phone Verification</option>
                  <option value="EmailVerification">Email Verification</option>
                  <option value="LoanApplication">Loan Application</option>
                  <option value="CurrentStatus">Current Status</option>
                  <option value="LoanApplicationKyc">
                    Loan Application KYC
                  </option>
                  <option value="LoanApplicationPersonalInfo">
                    Loan Application Personal Info
                  </option>
                  <option value="LoanApplicationBankDetails">
                    Loan Application Bank Details
                  </option>
                  <option value="LoanApplicationEmploymentInfo">
                    Loan Application Employment Info
                  </option>
                  <option value="LoanApplicationSelfie">
                    Loan Application Selfie
                  </option>
                  <option value="LoanApplicationAddressVerification">
                    Loan Application Address Verification
                  </option>
                  <option value="LoanApplicationReview">
                    Loan Application Review
                  </option>
                  <option value="LoanApplicationSubmit">
                    Loan Application Submit
                  </option>
                  <option value="onboarding_journey">Onboarding Journey</option>
                  <option value="in_process_daily_reminder">
                    In Process Daily Reminder
                  </option>
                  <option value="loan_rejection">Loan Rejection</option>
                  <option value="application_incomplete">
                    Application Incomplete
                  </option>
                  <option value="application_submission">
                    Application Submission
                  </option>
                </select>
              </div>
              <div>
                <label htmlFor="scheduled-form" className="block text-sm font-medium mb-1">
                  Scheduled At
                </label>
                <input
                  id="scheduled-form"
                  type="datetime-local"
                  value={formState.scheduledAt}
                  onChange={(e) => setFormState(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="provider-form" className="block text-sm font-medium mb-1">
                  Provider Message ID
                </label>
                <select
                  id="provider-form"
                  value={formState.providerMessageId}
                  onChange={(e) => setFormState(prev => ({ ...prev, providerMessageId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  required
                >
                  <option value="">Select provider message ID</option>
                  <option value="onboarding_journey">Onboarding Journey</option>
                  <option value="in_process_daily_reminder">
                    In Process Daily Reminder
                  </option>
                  <option value="loan_rejection">Loan Rejection</option>
                  <option value="application_incomplete">
                    Application Incomplete
                  </option>
                  <option value="application_submission">
                    Application Submission
                  </option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default RemindersComponent;
