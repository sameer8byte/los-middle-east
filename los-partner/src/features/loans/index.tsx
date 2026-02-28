import LoanList from "./components/loansList";
import { UpdateLoans } from "./components/UpdateLoans";

export function LoansComponent() {
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