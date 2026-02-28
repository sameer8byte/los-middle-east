import { LoanRequestComponent } from "../../features/loanRequest/index.tsx";
import MainLayout from "../../layouts/mainLayout.tsx";

export function LoanRequestPage() {
  return (
    <div>
          <MainLayout title="Loans">

      <LoanRequestComponent />
      {/* Add your loan request form or components here */}
    </MainLayout>
    </div>
  );
}