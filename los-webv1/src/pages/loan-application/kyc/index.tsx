import KycComponent from "../../../features/kyc/index.tsx";
import { KycLayout } from "../../../layouts/kycLoyout.tsx";
import MainLayout from "../../../layouts/mainLayout.tsx";

function Kyc() {
  return (
    <MainLayout title="Employment Information">
      <KycLayout>

      {/* Add your employment information form or content here */}
      <KycComponent />
      </KycLayout>

    </MainLayout>
  );
}

export default Kyc;