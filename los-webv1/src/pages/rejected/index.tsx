import { RejectedComponent } from "../../features/rejection/index.tsx";
import MainLayout from "../../layouts/mainLayout.tsx";

 
function RejectedPage() {
  return (
    <MainLayout title="Employment Information">
      <RejectedComponent/>
    </MainLayout>
  );
}

export default RejectedPage;