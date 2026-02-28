 import { Employment } from "./components/employment";
import { BankDetails } from "./components/bankDetails";
 import { HelpAndSupport } from "./components/helpAndSupport";
import { LoanHistory } from "./components/loanHistory";
import { UserInfo } from "./components/userInfo";
import Documents from "./components/documents";

export function SpecificProfileComponent() {
  const params = new URLSearchParams(window.location.search);
  const profileId = params.get("profileId") || "personal-information";

  return (
    <div 
      className="w-full p-6 md:p-8 min-h-screen transition-all duration-300"
      style={{
        backgroundColor: "var(--color-background)",
      } as React.CSSProperties}
    >
      <div className="w-full max-w-7xl mx-auto">
        {profileId === "personal-information" && <UserInfo />}
        {profileId === "documents" && <Documents />}
        {profileId === "employment-information" && <Employment />}
        {profileId === "bank-information" && <BankDetails />}
        {profileId === "loan-information" && <LoanHistory />}
        {profileId === "help-and-support" && <HelpAndSupport />}
      </div>
    </div>
  );
}
