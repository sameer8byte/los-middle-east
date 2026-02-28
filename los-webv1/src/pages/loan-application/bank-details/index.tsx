import BankDetailsComponent from "../../../features/bankAccount/index.tsx";
import { KycLayout } from "../../../layouts/kycLoyout.tsx";
import MainLayout from "../../../layouts/mainLayout.tsx";

function BankDetails() {
  return (
    <MainLayout title="Employment Information">
      <KycLayout>
        
        <BankDetailsComponent />
      </KycLayout>
      {/* Add your employment information form or content here */}
    </MainLayout>
  );
}

export default BankDetails;