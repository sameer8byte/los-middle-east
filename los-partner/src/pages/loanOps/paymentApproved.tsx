import { PermissionProvider } from "../../context/permissionContext";
import { RoleProvider } from "../../context/roleContext";
import { PaymentApprovedPageComponent } from "../../features/payment/paymentApproved";

export function PaymentApprovedPage() {
  return (
    <div>
      <RoleProvider>
        <PermissionProvider>
          <PaymentApprovedPageComponent />
        </PermissionProvider>
      </RoleProvider>
    </div>
  );
}
