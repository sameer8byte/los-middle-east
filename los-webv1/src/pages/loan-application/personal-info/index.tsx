import PersonalInfoComponent from "../../../features/personalInfo/index.tsx";
import { KycLayout } from "../../../layouts/kycLoyout.tsx";
import MainLayout from "../../../layouts/mainLayout.tsx";

function PersonalInfo() {
 
  return (
    <MainLayout title="Employment Information">
      <KycLayout>
        <PersonalInfoComponent />
      </KycLayout>
      {/* Add your employment information form or content here */}
    </MainLayout>
  );
}

export default PersonalInfo;
