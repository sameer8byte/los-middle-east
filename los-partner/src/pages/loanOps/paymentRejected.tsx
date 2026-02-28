import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import { PaymentRejectedPageComponent } from "../../features/payment/paymentRejected";
 
export function PaymentRejectedPage() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <PaymentRejectedPageComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}

