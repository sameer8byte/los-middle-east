import LoanApplicationComponent from "../../features/loanApplication/index.tsx";
import { KycLayout } from "../../layouts/kycLoyout.tsx";
 import MainLayout from "../../layouts/mainLayout.tsx";

function LoanApplication() {
   return (
    <div>
      <MainLayout title="Employment Information">
      <KycLayout>

        <LoanApplicationComponent />
      </KycLayout>
      </MainLayout>

    </div>
  );
}
export default LoanApplication;
