import CompletedLoansTable from "../components/CompletedLoansTable";

export default function SettledLoans() {
  return (
    <CompletedLoansTable
      title="Settled Loans"
      status='["SETTLED"]'
      storageKey="loanSettlement"
      emptyMessage="No settled loans found"
    />
  );
}

