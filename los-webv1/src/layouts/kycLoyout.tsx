import GeolocationPrompt from "../common/GeolocationPrompt";
// import ActiveTabUi from "../common/ui/activeTabUi";
import { ApplicationTips } from "../common/ui/applicationTips";
import { NeedHelp } from "../common/ui/needHelp";
// import { SecureApplication } from "../common/ui/secureApplication";
import LoanApplicationComponent from "../features/loanApplication";
import { extractCustomParams } from "../utils/utils";
import { NeedHelpDialog } from "./needHelpDialog";

export function KycLayout({ children }: { children: React.ReactNode }) {
  // if page = /loan-application then show the active tab
  const pathname = window.location.pathname;
  const isLoanApplicationPage = pathname === "/loan-application";
  const customParams = extractCustomParams();

  return (
    <div className="flex flex-col bg-surface">
      {/* <ActiveTabUi activeTab="application" /> */}
      {customParams.platformType === "mobile-app" && <GeolocationPrompt />}
      <NeedHelpDialog />

      <div className="flex flex-col lg:flex-row gap-6 p-4   md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Main content area */}

        {/* Sidebar */}
        <div className="  g:w-1/3 hidden  lg:flex sticky top-0 max-h-screen overflow-x-auto ">
          {isLoanApplicationPage ? (
            <div className="space-y-4">
              <ApplicationTips />
              {/* <SecureApplication /> */}
              <NeedHelp />
            </div>
          ) : (
            <div>
              <LoanApplicationComponent />
            </div>
          )}
        </div>

        <div className="flex-grow lg:w-2/3   ">
          <div className="rounded-brand bg-transparent md:bg-white shadow-none md:shadow-xs py-0 md:py-6 px-0 md:px-6 ">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
