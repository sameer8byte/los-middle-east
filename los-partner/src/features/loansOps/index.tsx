import LoanList from "./components/loansList";
import { UpdateLoans } from "./components/UpdateLoans";

export function LoansOpsComponent() {
  return (
    <div>
      <div className="flex-1 overflow-x-auto">
        <LoanList />
      </div>
      <UpdateLoans />
    </div>
  );
}
