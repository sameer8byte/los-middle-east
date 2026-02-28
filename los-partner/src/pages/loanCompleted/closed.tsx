import CompletedLoansTable from "../../features/loanCompleted/components/CompletedLoansTable";

export function LoanClosed() {
  return (
    <CompletedLoansTable
      title="All Closed Loans"
      status='["COMPLETED", "SETTLED", "WRITE_OFF"]'
      storageKey="loanClosed"
      emptyMessage="No closed loans found"
    />
  );
}