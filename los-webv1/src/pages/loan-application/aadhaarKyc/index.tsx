 import AadhaarKYCComponent from "../../../features/aadhaarKYC/index.tsx";
import { KycLayout } from "../../../layouts/kycLoyout.tsx";
import MainLayout from "../../../layouts/mainLayout.tsx";

function AadhaarKycPage() {
  return (
    <MainLayout title="Employment Information">
      <KycLayout>
        <AadhaarKYCComponent />
      </KycLayout>
    </MainLayout>
  );
}

export default AadhaarKycPage;
