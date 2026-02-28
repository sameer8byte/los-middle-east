import CompletedLoansTable from "../components/CompletedLoansTable";

export default function WriteOffLoans() {
  return (
    <CompletedLoansTable
      title="Write-Off Loans"
      status='["WRITE_OFF"]'
      storageKey="loanWriteOff"
      emptyMessage="No write-off loans found"
    />
  );
}

