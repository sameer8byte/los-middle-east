import CompletedLoansTable from "../components/CompletedLoansTable";

export default function AllCompletedLoans() {
  return (
    <CompletedLoansTable
      title="All Completed Loans"
      status='["COMPLETED", "SETTLED", "WRITE_OFF"]'
      storageKey="loanCompletedAll"
      emptyMessage="No completed loans found"
    />
  );
}
