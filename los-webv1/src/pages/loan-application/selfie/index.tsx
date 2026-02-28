import PhotoAndVideoComponent from "../../../features/photoAndVideo/index.tsx";
import { KycLayout } from "../../../layouts/kycLoyout.tsx";
import MainLayout from "../../../layouts/mainLayout.tsx";

function Selfie() {
  return (
    <MainLayout title="Employment Information">
      <KycLayout>
        <PhotoAndVideoComponent />
      </KycLayout>
      {/* Add your employment information form or content here */}
    </MainLayout>
  );
}

export default Selfie;
