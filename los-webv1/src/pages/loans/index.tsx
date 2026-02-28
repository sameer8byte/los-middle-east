import { LoanComponent } from "../../features/loan";
import MainLayout from "../../layouts/mainLayout";

function Loans() {
  return (
    <MainLayout title="Loans">
      <LoanComponent />
    </MainLayout>
  );
}

export default Loans;