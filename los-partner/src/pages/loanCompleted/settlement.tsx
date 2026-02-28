import CompletedLoansTable from "../../features/loanCompleted/components/CompletedLoansTable";

export function LoanSettled() {
  return (
    <CompletedLoansTable
      title="Settled Loans"
      status='["SETTLED"]'
      storageKey="loanSettlement"
      emptyMessage="No settled loans found"
    />
  );
}