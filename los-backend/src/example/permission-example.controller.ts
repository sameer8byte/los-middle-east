import { Controller, Get, HttpCode, HttpStatus, UseGuards } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { Roles } from "src/common/decorators/roles.decorator";
import { Permissions } from "src/common/decorators/permissions.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { 
  RequireRoleOrPermission, 
  RequireRoleAndPermission, 
  RequireEitherRoleOrPermission,
  RequireReadPermission,
  RequireWritePermission
} from "src/common/decorators/role-permission.decorator";
import { RolePermissionGuard } from "src/common/guards/role-permission.guard";
import { PermissionType } from "@prisma/client";
import { AuthenticatedPartnerUser, PartnerUserPermission } from "src/common/types/partner-user.types";

/**
 * Example controller demonstrating different ways to use guards
 * This is for demonstration purposes - you can apply these patterns to your existing controllers
 */
@AuthType("partner")
@UseGuards(RolePermissionGuard) // This guard handles all role/permission decorators
@Controller("example/permissions")
export class PermissionExampleController {
  
  /**
   * Example 1: Using only role-based access
   * Only users with ADMIN role can access this endpoint
   */
  @Roles("ADMIN")
  @Get("admin-only")
  @HttpCode(HttpStatus.OK)
  async adminOnly() {
    return { message: "This endpoint requires ADMIN role" };
  }

  /**
   * Example 2: Using only permission-based access
   * Only users with CUSTOMER permission can access this endpoint
   */
  @Permissions("CUSTOMER")
  @Get("customer-permission")
  @HttpCode(HttpStatus.OK)
  async customerPermission() {
    return { message: "This endpoint requires CUSTOMER permission" };
  }

  /**
   * Example 3: Using combined role OR permission (default behavior)
   * Users with ADMIN role OR CUSTOMER permission can access this endpoint
   */
  @RequireEitherRoleOrPermission(["ADMIN"], ["CUSTOMER"])
  @Get("admin-or-customer")
  @HttpCode(HttpStatus.OK)
  async adminOrCustomer() {
    return { message: "This endpoint requires ADMIN role OR CUSTOMER permission" };
  }

  /**
   * Example 4: Using combined role AND permission
   * Users must have ADMIN role AND CUSTOMER permission to access this endpoint
   */
  @RequireRoleAndPermission(["ADMIN"], ["CUSTOMER"])
  @Get("admin-and-customer")
  @HttpCode(HttpStatus.OK)
  async adminAndCustomer() {
    return { message: "This endpoint requires ADMIN role AND CUSTOMER permission" };
  }

  /**
   * Example 5: Using flexible role/permission requirement
   * Users with either ADMIN or OTHER role, or CUSTOMER permission can access
   */
  @RequireRoleOrPermission({
    roles: ["ADMIN", "OTHER"],
    permissions: [{ permission: "CUSTOMER", type: PermissionType.ALL },
      { permission: 'ALL', type: PermissionType.ALL },
    ],
    operator: "OR"
  })
  @Get("flexible-access")
  @HttpCode(HttpStatus.OK)
  async flexibleAccess() {
    return { message: "This endpoint allows flexible access based on roles or permissions" };
  }

  /**
   * Example 8: Using READ permission only
   * Users with CUSTOMER READ permission can access this endpoint
   */
  @RequireReadPermission(["CUSTOMER"])
  @Get("customer-read")
  @HttpCode(HttpStatus.OK)
  async customerRead() {
    return { message: "This endpoint requires CUSTOMER READ permission" };
  }

  /**
   * Example 9: Using WRITE permission only
   * Users with CUSTOMER WRITE permission can access this endpoint
   */
  @RequireWritePermission(["CUSTOMER"])
  @Get("customer-write")
  @HttpCode(HttpStatus.OK)
  async customerWrite() {
    return { message: "This endpoint requires CUSTOMER WRITE permission" };
  }

  /**
   * Example 10: Using mixed permission types
   * Users need ADMIN role AND CUSTOMER WRITE permission
   */
  @RequireRoleAndPermission(["ADMIN"], ["CUSTOMER"], PermissionType.WRITE)
  @Get("admin-with-customer-write")
  @HttpCode(HttpStatus.OK)
  async adminWithCustomerWrite() {
    return { message: "This endpoint requires ADMIN role AND CUSTOMER WRITE permission" };
  }

  /**
   * Example 6: Multiple roles with OR logic
   */
  @Roles("ADMIN", "SUPER_ADMIN", "OTHER")
  @Get("multiple-roles")
  @HttpCode(HttpStatus.OK)
  async multipleRoles() {
    return { message: "This endpoint requires ADMIN, SUPER_ADMIN, or OTHER role" };
  }

  /**
   * Example 7: No additional guards - only authentication required
   * Any authenticated partner user can access this endpoint
   */
  @Get("authenticated-only")
  @HttpCode(HttpStatus.OK)
  async authenticatedOnly() {
    return { message: "This endpoint only requires authentication" };
  }

  /**
   * Example 11: Using GetPartnerUser decorator to access user info
   * Demonstrates how to get partner user information in your controllers
   */
  @Get("user-info")
  @HttpCode(HttpStatus.OK)
  async getUserInfo(@GetPartnerUser() partnerUser: AuthenticatedPartnerUser) {
    return {
      message: "Partner user information",
      user: {
        id: partnerUser.id,
        name: partnerUser.name,
        email: partnerUser.email,
        brandId: partnerUser.brandId,
        roles: partnerUser.roles,
        permissions: partnerUser.permissions,
        isActive: partnerUser.isActive,
      },
    };
  }

  /**
   * Example 12: Getting specific user properties
   */
  @Get("user-id")
  @HttpCode(HttpStatus.OK)
  async getUserId(@GetPartnerUser('id') userId: string) {
    return { userId };
  }

  @Get("user-roles")
  @HttpCode(HttpStatus.OK)
  async getUserRoles(@GetPartnerUser('roles') roles: string[]) {
    return { roles };
  }

  @Get("user-permissions")
  @HttpCode(HttpStatus.OK)
  async getUserPermissions(@GetPartnerUser('permissions') permissions: PartnerUserPermission[]) {
    return { permissions };
  }
}
