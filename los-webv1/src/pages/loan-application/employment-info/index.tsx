import EmploymentInfoComponent from "../../../features/employmentInfo/index";
import { KycLayout } from "../../../layouts/kycLoyout";
import MainLayout from "../../../layouts/mainLayout.tsx";

function EmploymentInfo() {
  return (
    <MainLayout title="Employment Information">
      <KycLayout>

      {/* Add your employment information form or content here */}
      <EmploymentInfoComponent />
      </KycLayout>

    </MainLayout>
  );
}

export default EmploymentInfo;