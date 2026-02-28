import React from 'react';
import { useRole } from '../context/roleContext';
import { usePermission } from '../context/permissionContext';
import { PartnerUserRoleEnum, PartnerUserPermissionEnum } from '../constant/enum';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: PartnerUserRoleEnum[];
  allowedPermissions?: PartnerUserPermissionEnum[];
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  allowedPermissions = [],
  fallback = (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Denied</h2>
        <p className="text-gray-500">You don't have permission to access this page.</p>
      </div>
    </div>
  ),
}) => {
  const { role } = useRole();
  const { permission } = usePermission();

  const hasRequiredRole = allowedRoles.length === 0 || allowedRoles.includes(role);
  // Check if user has required permission
  const hasRequiredPermission = 
    allowedPermissions.length === 0 ||
    allowedPermissions.some(reqPermission => 
      permission?.partnerPermission?.name === reqPermission
    );

  // Allow access if user has either required role OR required permission
  const hasAccess = hasRequiredRole || hasRequiredPermission;

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
