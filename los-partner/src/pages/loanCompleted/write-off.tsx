import CompletedLoansTable from "../../features/loanCompleted/components/CompletedLoansTable";

export function LoanWriteOff() {
  return (
    <CompletedLoansTable
      title="Write-Off Loans"
      status='["WRITE_OFF"]'
      storageKey="loanWriteOff"
      emptyMessage="No write-off loans found"
    />
  );
}