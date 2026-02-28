import CustomersList from "./components/customersList";
import { UserReloan } from "./components/userReloan";

function CustomersComponent() {
  return (
    <div>
      <UserReloan />
        <div className="flex-1 overflow-x-auto">
          <CustomersList />
      </div>
    </div>
  );
}
export default CustomersComponent;