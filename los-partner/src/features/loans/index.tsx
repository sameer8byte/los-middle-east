import LoanList from "./components/loansList";
import { UpdateLoans } from "./components/UpdateLoans";
import { useEffect } from "react";

export function LoansComponent() {
  // Clear credit risk data from session storage when navigating to loans page
  // This ensures fresh data is generated for new users
  useEffect(() => {
    const creditRiskDataStored = sessionStorage.getItem('creditRiskData');
    if (creditRiskDataStored) {
      sessionStorage.removeItem('creditRiskData');
    }
  }, []);

  return (
    <div className="flex flex-col">
     

      <LoanList />

      {/* Update Loans Section */}
      <div className="flex-shrink-0 bg-white border-t w-full">
        <UpdateLoans />
      </div>
    </div>
  );
}