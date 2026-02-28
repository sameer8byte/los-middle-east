import { useState, useEffect } from "react";
import { 
  BiLoaderAlt, 
  BiErrorCircle, 
  BiChevronRight, 
  BiChevronDown,
  BiUser,
  BiTime
} from "react-icons/bi";
import {
  getPartnerUserAuditLogs,
  getPartnerUserCodeAuditLogs,
  getBrandSettingAuditLogs,
  getPartnerUserLoginLogs,
} from "../../../shared/services/api/partner-user.api";
import { formatDateWithTime } from "../../../lib/utils";
import Dialog from "../../../common/dialog";

// --- Types ---
interface AuditLogsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly userId: string;
  readonly userName: string;
  readonly userEmail: string;
  readonly brandId: string;
}

// --- Helper: Status Badge ---
const ActionBadge = ({ action, status }: { action: string, status?: string }) => {
  const normalized = (action + (status || "")).toLowerCase();
  
  let styles = "bg-gray-100 text-gray-700 border-gray-200";
  
  if (normalized.includes("create") || normalized.includes("add")) {
    styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (normalized.includes("delete") || normalized.includes("remove") || normalized.includes("fail")) {
    styles = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (normalized.includes("update") || normalized.includes("edit")) {
    styles = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-md border ${styles}`}>
      {action}
    </span>
  );
};

// --- Helper: Changes View ---
const ChangesView = ({ changes }: { changes?: Record<string, any> }) => {
  if (!changes || Object.keys(changes).length === 0) return null;
  
  return (
    <div className="mt-3 bg-slate-50 rounded border border-slate-100 p-3 text-xs font-mono text-slate-700">
      <div className="flex flex-col gap-1">
        {Object.entries(changes).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2">
            <span className="font-semibold text-slate-900 min-w-[120px]">{key}:</span>
            <span className="break-all opacity-80">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Helper: Get tab label ---
const getTabLabel = (tab: string) => {
  if (tab === "settings") return "Brand Settings";
  if (tab === "login") return "Login Logs";
  return `${tab} Logs`;
};

// --- Component: Log Row ---
const LogRow = ({ log }: { log: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasDetails = log.details || (log.changes && Object.keys(log.changes).length > 0);
  const isSessionSummary = log.status === "Summary" && log.changes?.sessionDetails;

  return (
    <div className="group border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <button 
        onClick={() => hasDetails && setIsOpen(!isOpen)}
        className={`w-full text-left p-4 flex items-center justify-between gap-4 ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-4 overflow-hidden">
           {/* Expand Icon */}
          <div className={`text-slate-400 transition-transform duration-200 ${hasDetails ? '' : 'invisible'}`}>
             {isOpen ? <BiChevronDown size={20} /> : <BiChevronRight size={20} />}
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900 truncate">
                {log.action || log.codeStatus || "System Action"}
              </span>
              <ActionBadge action={log.status || "Log"} status={log.status} />
            </div>
            
            {/* User Meta */}
            {log.createdBy && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <BiUser className="shrink-0" />
                <span className="truncate">{log.createdBy.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Date Meta */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap">
          <BiTime />
          {formatDateWithTime(log.createdAt)}
        </div>
      </button>

      {/* Expanded Details */}
      {isOpen && hasDetails && (
        <div className="px-4 pb-4 pl-12">
          {log.details && (
            <p className="text-sm text-slate-600 mb-3">{log.details}</p>
          )}
          
          {/* Session Details Table for Login Logs */}
          {isSessionSummary && log.changes?.sessionDetails && Array.isArray(log.changes.sessionDetails) && (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border border-slate-200">
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Session</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Login Time</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Logout Time</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Duration</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Device</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {log.changes.sessionDetails.map((session: any) => (
                    <tr key={`${log.id}_session_${session.sessionNumber}`} className="border border-slate-200 hover:bg-slate-50">
                      <td className="px-2 py-2 text-slate-700 font-medium">#{session.sessionNumber}</td>
                      <td className="px-2 py-2 text-slate-600">{session.loginTime}</td>
                      <td className="px-2 py-2 text-slate-600">{session.logoutTime}</td>
                      <td className="px-2 py-2 text-slate-600 font-semibold">{session.duration}</td>
                      <td className="px-2 py-2 text-slate-600">{session.device}</td>
                      <td className="px-2 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          session.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Regular Changes View */}
          {!isSessionSummary && (
            <ChangesView changes={log.changes} />
          )}
        </div>
      )}
    </div>
  );
};

// --- Main Modal ---
export function AuditLogsModal({
  isOpen,
  onClose,
  userId,
  userName,
  brandId,
}: Readonly<AuditLogsModalProps>) {
  const [activeTab, setActiveTab] = useState<"audit" | "code" | "settings" | "login">("audit");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [codeAuditLogs, setCodeAuditLogs] = useState<any[]>([]);
  const [settingsAuditLogs, setSettingsAuditLogs] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const pageSize = 10;

  useEffect(() => {
    if (isOpen && (userId || activeTab === "settings")) {
      fetchLogs();
    }
  }, [isOpen, userId, activeTab, page, startDate, endDate]);

  // Reset page when switching tabs
  const handleTabChange = (tab: "audit" | "code" | "settings" | "login") => {
    setActiveTab(tab);
    setPage(1);
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === "audit") {
        const res = await getPartnerUserAuditLogs(brandId, userId, { 
          page, 
          limit: pageSize,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        const data = Array.isArray(res) ? res : res.data || res || [];
        setAuditLogs(data);
      } else if (activeTab === "code") {
        const res = await getPartnerUserCodeAuditLogs(brandId, userId, { 
          page, 
          limit: pageSize,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        const data = Array.isArray(res) ? res : res.data || res || [];
        setCodeAuditLogs(data);
      } else if (activeTab === "settings") {
        const res = await getBrandSettingAuditLogs(brandId, { 
          page, 
          limit: pageSize,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        // Handle paginated response from brand settings API
        let data: any[] = [];
        if (res.data) {
          data = res.data;
        } else if (Array.isArray(res)) {
          data = res;
        } else {
          data = res || [];
        }
        setSettingsAuditLogs(data);
      } else if (activeTab === "login") {
        const res = await getPartnerUserLoginLogs(brandId, userId, { 
          page, 
          limit: pageSize,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        const data = Array.isArray(res) ? res : res.data || res || [];
        setLoginLogs(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load logs");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  let logs: any[] = [];
  if (activeTab === "audit") logs = auditLogs;
  else if (activeTab === "code") logs = codeAuditLogs;
  else if (activeTab === "settings") logs = settingsAuditLogs;
  else if (activeTab === "login") logs = loginLogs;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`History: ${userName}`}>
      <div>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {["audit", "code", "settings", "login"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab as any)}
              className={`px-6 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>

        {/* Date Filter for All Tabs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="start-date" className="text-xs font-medium text-slate-600">Start Date</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-slate-300 rounded bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="end-date" className="text-xs font-medium text-slate-600">End Date</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-slate-300 rounded bg-white"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
                className="self-end px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                title="Clear date filter"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto relative scroll-smooth">
          {error && (
            <div className="m-4 p-3 bg-red-50 text-red-700 text-sm rounded flex items-center gap-2">
              <BiErrorCircle size={18} /> {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
              <BiLoaderAlt className="animate-spin" size={24} />
              <span className="text-sm">Loading...</span>
            </div>
          ) : null}

          {!isLoading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <span className="text-sm">No records found</span>
            </div>
          ) : null}

          {!isLoading && logs.length > 0 && (
            <div>
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Page {page} • {logs.length} items
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 text-slate-700"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={logs.length < pageSize || isLoading}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 text-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}