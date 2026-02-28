import CompletedLoansTable from "../../features/loanCompleted/components/CompletedLoansTable";

export function LoanCompletedAllPages() {
  return (
    <CompletedLoansTable
      title="Completed Loans"
      status='["COMPLETED"]'
      storageKey="loanCompleted"
      emptyMessage="No completed loans found"
    />
  );
}