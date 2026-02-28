import CurrentStatusComponent from "../../../features/currentStatus/index.tsx";
import { KycLayout } from "../../../layouts/kycLoyout.tsx";
import MainLayout from "../../../layouts/mainLayout.tsx";

function CurrentStatus() {
  return (
    <MainLayout title="Employment Information">
      <KycLayout>
        <CurrentStatusComponent />
      </KycLayout>
    </MainLayout>
  );
}

export default CurrentStatus;
