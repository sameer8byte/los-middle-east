import { ProfileComponent } from "../../features/profile/index.tsx";
import MainLayout from "../../layouts/mainLayout.tsx";

 
function ProfilePage() {
  return (
    <MainLayout title="Employment Information">
      <ProfileComponent/>
      {/* Add your employment information form or content here */}
    </MainLayout>
  );
}

export default ProfilePage;