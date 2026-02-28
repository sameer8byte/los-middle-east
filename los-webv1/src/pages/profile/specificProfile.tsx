import { SpecificProfileComponent } from "../../features/specificProfile/index.tsx";
import MainLayout from "../../layouts/mainLayout.tsx";

 
function SpecificProfilePage() {
  return (
    <MainLayout title="Employment Information">
      <SpecificProfileComponent/>
      {/* Add your employment information form or content here */}
    </MainLayout>
  );
}

export default SpecificProfilePage;