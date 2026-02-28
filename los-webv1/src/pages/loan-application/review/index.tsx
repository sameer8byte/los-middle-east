import { ReviewComponent } from "../../../features/review/index.tsx";
import { KycLayout } from "../../../layouts/kycLoyout.tsx";
import MainLayout from "../../../layouts/mainLayout.tsx";

function Review() {
  return (
    <MainLayout title="Employment Information">
            <KycLayout>
      
      <ReviewComponent />
      </KycLayout>
      {/* Add your employment information form or content here */}
    </MainLayout>
  );
}

export default Review;