import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import { PaymentApprovalPageComponent } from "../../features/payment/paymentApproval";
 
export function PaymentApprovalPage() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <PaymentApprovalPageComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}

