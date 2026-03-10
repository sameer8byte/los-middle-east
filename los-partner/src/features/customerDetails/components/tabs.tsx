import { useMemo, useEffect } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { useAppSelector } from "../../../shared/redux/store";

// --- Enum for all tab keys ---
export enum TabKey {
  PERSONAL_DETAILS = "PERSONAL_DETAILS",
  ACCOUNT_DETAILS = "ACCOUNT_DETAILS",
  EMPLOYMENT_DETAILS = "EMPLOYMENT_DETAILS",
  DOCUMENTS = "DOCUMENTS",
  AADHAAR_KYC = "AADHAAR_KYC",
  SUMMARY = "SUMMARY",
  LOAN_APPLICATIONS = "LOAN_APPLICATIONS",
  CUSTOMER_CALL_LOGS = "CUSTOMER_CALL_LOGS",
  AUDIT_LOGS = "AUDIT_LOGS",
  CENTRAL_DEDUPE = "CENTRAL_DEDUPE",
}

// --- Type Definitions ---
interface TabItem {
  key: TabKey;
  label: string;
  description?: string;
}

interface TabSelectorProps {
  readonly role?: string;
}

// --- Tab Configuration ---
const ALL_TABS: readonly TabItem[] = [
  { key: TabKey.PERSONAL_DETAILS, label: "Personal Details" },
/*   {
    key: TabKey.CENTRAL_DEDUPE,
    label: "Central Dedupe",
    description: "View deduplication results from central database.",
  }, */
  { key: TabKey.ACCOUNT_DETAILS, label: "Bank Accounts" },
  { key: TabKey.EMPLOYMENT_DETAILS, label: "Employment" },
  { key: TabKey.DOCUMENTS, label: "Documents" },
  { key: TabKey.SUMMARY, label: "Credits & Reports" },
  {
    key: TabKey.LOAN_APPLICATIONS,
    label: "Loan Applications",
    description:
      "View and manage all loan applications submitted by the customer.",
  },
  {
    key: TabKey.CUSTOMER_CALL_LOGS,
    label: "Customer Call Logs",
    description: "View all call records and history for this customer.",
  },
  {
    key: TabKey.AUDIT_LOGS,
    label: "Audit Logs",
    description: "View detailed Audit logs and user interactions.",
  },
];

export default function TabSelector({ role }: TabSelectorProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { fallbackpage } = useParams<{ fallbackpage?: string }>();
  const brandConfig = useAppSelector((state) => state.brand);
  const userRole = role ?? fallbackpage ?? "guest";

  // Filter tabs based on role
  const allowedTabs = useMemo(() => {
    // Only show CENTRAL_DEDUPE if enable_central_dedup is true in brand config
    const showCentralDedupe = brandConfig.brandConfig.enable_central_dedup;
    return ALL_TABS.filter((tab) => {
      if (tab.key === TabKey.CENTRAL_DEDUPE && !showCentralDedupe) {
        return false;
      }
      return true;
    });
  }, [userRole, brandConfig.brandConfig.enable_central_dedup]);

  // Get and validate current tab
  const currentTab = searchParams.get("tab") as TabKey | null;

  const activeTab: TabKey = useMemo(() => {
    if (currentTab && allowedTabs.some((t) => t.key === currentTab)) {
      return currentTab;
    }
    return allowedTabs[0]?.key ?? TabKey.PERSONAL_DETAILS;
  }, [currentTab, allowedTabs]);

  // Ensure URL has a valid `tab` parameter
  useEffect(() => {
    if (!currentTab || !allowedTabs.some((t) => t.key === currentTab)) {
      setSearchParams({ tab: activeTab });
    }
  }, [allowedTabs, currentTab, setSearchParams, activeTab]);

  const handleTabChange = (tabKey: TabKey) => {
    setSearchParams({ tab: tabKey });
  };

  return (
    <div className="relative w-full border-b border-[var(--border)] bg-[var(--background)]">
      <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--color-muted)] scrollbar-track-transparent hover:scrollbar-thumb-[var(--muted-foreground)] py-2 px-1">
        {allowedTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              role="tab"
              aria-selected={isActive}
              title={tab.description || tab.label}
              className={`flex-shrink-0 whitespace-nowrap px-3 py-1.5 sm:text-xs 2xl:text-lg font-semibold rounded-t-lg transition-all duration-200
                ${
                  isActive
                    ? "text-[var(--color-primary)] bg-white border-b-2 border-[var(--color-primary)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white hover:bg-opacity-30"
                }`}
            >
              {tab.label}
              {isActive && <span className="sr-only"> (current)</span>}
            </button>
          );
        })}
      </div>
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-[var(--border)]" />
    </div>
  );
}
