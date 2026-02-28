import HomeComponent from "../../features/home/index.tsx";
import MainLayout from "../../layouts/mainLayout.tsx";

 
function Home() {
  return (
    <MainLayout title="Employment Information">
      {/* Add your employment information form or content here */}
      <HomeComponent />
    </MainLayout>
  );
}

export default Home;