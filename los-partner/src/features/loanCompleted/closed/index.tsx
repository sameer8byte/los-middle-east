import CompletedLoansTable from "../components/CompletedLoansTable";

export default function LoansClosed() {
  return (
    <CompletedLoansTable
      title="All Completed Loans"
      status='["COMPLETED"]'
      storageKey="loanCompletedAll"
      emptyMessage="No completed loans found"
    />
  );
}
