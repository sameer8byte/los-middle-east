import { useNavigate, useParams } from "react-router-dom";
import { UserReloan } from "../customers/components/userReloan";

import { CustomerDetails } from "./components/customerDetails";
import { CustomerDocuments } from "./components/customerDocuments";
import { CustomerEmployment } from "./components/customerEmployment";
import { CustomerLoans } from "./components/customerLoans";
// import { CustomerProfile } from "./components/customerProfile";
import { LoanPayNow } from "./components/loanPayNow";
import { LoanRepaymentDetails } from "./components/loanRepaymentDetails";
import { CreditReport } from "./components/customerCreditReport";
import TabSelector, { TabKey } from "./components/tabs";
import { CustomerBankAccounts } from "./components/customerBankAccounts";
import UserLogs from "./components/user-logs";
import { CentralDqueueComponent } from "./components/centralDeque";
import { GenerateAadhaarLink } from "./components/generateAddharLink";
import CustomerCallLogs from "./components/customerCallLogs";

function CustomerDetailsComponent() {
  const queryParams = new URLSearchParams(window.location.search);
  const tab = queryParams.get("tab") || "PERSONAL_DETAILS";
  const navigate = useNavigate();
  const { brandId, customerId, fallbackpage } = useParams();

  // Extract role from fallbackpage (which contains the role-based route)
  const userRole = fallbackpage

  const handleBackNavigation = () => {
    if (brandId && fallbackpage) {
      navigate(`/${brandId}/${fallbackpage}`);
    }
  };

  return (
    <div className="overflow-x-hidden">
      <UserReloan />
      <LoanPayNow />
      <LoanRepaymentDetails />
      <div className="flex flex-col lg:flex-row gap-3 p-3 bg-[var(--secondary-bg)] min-h-screen h-screen lg:h-[calc(100vh-0px)] lg:overflow-hidden">
        {/* Left Sidebar - Sticky with independent scroll */}
        {/* <div className="w-full lg:w-80 flex-shrink-0 lg:h-full lg:overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--color-muted)] scrollbar-track-transparent hover:scrollbar-thumb-[var(--muted-foreground)]">
          <div className="bg-white rounded-lg shadow-sm p-3 lg:sticky lg:top-0">
            <CustomerProfile />
          </div>
        </div> */}

        {/* Main Content - Independent scroll */}
        <div className="flex-1 min-w-0 lg:h-full lg:overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--color-muted)] scrollbar-track-transparent hover:scrollbar-thumb-[var(--muted-foreground)]">
          {/* Back Navigation */}
          {fallbackpage && (
            <div className="mb-2">
              <button
                onClick={handleBackNavigation}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] bg-white hover:bg-[var(--color-primary)] hover:text-white border border-[var(--border)] rounded-md shadow-sm transition-all duration-200"
                title={`Back to ${
                  fallbackpage.charAt(0).toUpperCase() +
                  fallbackpage.slice(1).replace("-", " ")
                }`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm">
            {/* Header - Sticky */}
            {/* <div className="sticky top-0 z-10 px-4 py-2.5 border-b border-[var(--border)] bg-gradient-to-r from-[var(--background)] to-white">
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Customer Details
              </h2>
            </div> */}

            {/* Tabs - Sticky */}
            <div className="sticky top-[0px] z-10 bg-white">
              <TabSelector role={userRole || ""} />
            </div>

            {/* Content */}
            <div className="p-4">
              {tab === TabKey.PERSONAL_DETAILS && <CustomerDetails />}

              {tab === TabKey.ACCOUNT_DETAILS && <CustomerBankAccounts />}

              {tab === TabKey.EMPLOYMENT_DETAILS && <CustomerEmployment />}

              {tab === TabKey.DOCUMENTS && <CustomerDocuments />}

              {tab === TabKey.AADHAAR_KYC && (
                <GenerateAadhaarLink 
                  userId={customerId || ''} 
                  brandId={brandId || ''} 
                />
              )}

              {tab === TabKey.LOAN_APPLICATIONS && <CustomerLoans />}

              {tab === TabKey.CUSTOMER_CALL_LOGS && <CustomerCallLogs />}

              {tab === TabKey.SUMMARY && <CreditReport />}
              {tab === TabKey.AUDIT_LOGS && <UserLogs />}
              {tab === TabKey.CENTRAL_DEDUPE && <CentralDqueueComponent />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetailsComponent;
