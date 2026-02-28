import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLE_PERMISSION_KEY, RolePermissionRequirement } from "../decorators/role-permission.decorator";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
 import { PrismaService } from "src/prisma/prisma.service";
import { PermissionsEnum } from "src/constant/permissions";
import { RoleEnum } from "src/constant/roles";

@Injectable()
export class RolePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const partnerUser = request.partnerUser;

    if (!partnerUser) {
      throw new ForbiddenException(
        "Partner user not found in request. Ensure AuthGuard is applied before RolePermissionGuard.",
      );
    }

    // Check for combined role-permission requirement first
    const rolePermissionRequirement = this.reflector.getAllAndOverride<RolePermissionRequirement>(
      ROLE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Check for individual role requirement
    const requiredRoles = this.reflector.getAllAndOverride<(keyof typeof RoleEnum)[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Check for individual permission requirement
    const requiredPermissions = this.reflector.getAllAndOverride<(keyof typeof PermissionsEnum)[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If no requirements are specified, allow access
    if (!rolePermissionRequirement && !requiredRoles && !requiredPermissions) {
      return true;
    }

    // Get user details with roles and permissions
    const userWithDetails = await this.prisma.partnerUser.findUnique({
      where: {
        id: partnerUser.id,
        isActive: true,
      },
      include: {
        userPermissions: {
          include: {
            partnerPermission: true,
          },
        },
        globalRoles: {
          include: {
            role: true,
          },
        },
        brandRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!userWithDetails) {
      throw new ForbiddenException("User not found or inactive");
    }

    // Get user's roles and permissions
    const userRoles = [
      ...userWithDetails.globalRoles.map((gr) => gr.role.name),
      ...userWithDetails.brandRoles.map((br) => br.role.name),
    ];

    const userPermissions = userWithDetails.userPermissions.map((up) => ({
      name: up.partnerPermission.name,
      type: up.partnerPermissionType,
    }));
    if (userRoles.includes('SUPER_ADMIN')) {
      return true;
    }

    // Handle combined role-permission requirement
    if (rolePermissionRequirement) {
      return this.checkRolePermissionRequirement(
        rolePermissionRequirement,
        userRoles,
        userPermissions
      );
    }

    // Handle individual role requirement
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => userRoles.includes(role));
      if (!hasRole) {
        throw new ForbiddenException(
          `User does not have required roles. Required: ${requiredRoles.join(", ")}. User has: ${userRoles.join(", ")}`
        );
      }
    }

    // Handle individual permission requirement
    if (requiredPermissions && requiredPermissions.length > 0) {
      const permissionReqs = requiredPermissions.map(p => ({ permission: p, type: 'ALL' }));
      const hasPermission = this.userHasPermissions(permissionReqs, userPermissions);
      
      if (!hasPermission) {
        const userPermissionStrings = userPermissions.map(up => `${up.name}(${up.type})`);
        throw new ForbiddenException(
          `User does not have required permissions. Required: ${requiredPermissions.join(", ")} with ALL access. User has: ${userPermissionStrings.join(", ")}`
        );
      }
    }

    return true;
  }

  private checkRolePermissionRequirement(
    requirement: RolePermissionRequirement,
    userRoles: string[],
    userPermissions: { name: string; type: string }[]
  ): boolean {
    const { roles, permissions, operator } = requirement;
    const hasRequiredRoles = this.userHasRoles(roles, userRoles);
    const hasRequiredPermissions = this.userHasPermissions(permissions, userPermissions);

    if (operator === 'AND') {
      return this.validateAndRequirement(roles, permissions, hasRequiredRoles, hasRequiredPermissions, userRoles, userPermissions);
    }
    
    return this.validateOrRequirement(roles, permissions, hasRequiredRoles, hasRequiredPermissions, userRoles, userPermissions);
  }

  private userHasRoles(requiredRoles: string[] | undefined, userRoles: string[]): boolean {
    return requiredRoles ? requiredRoles.some((role) => userRoles.includes(role)) : true;
  }

  private userHasPermissions(
    requiredPermissions: { permission: string; type?: string }[] | undefined, 
    userPermissions: { name: string; type: string }[]
  ): boolean {
    if (!requiredPermissions) return true;
    
    return requiredPermissions.some((req) =>
      userPermissions.some((userPerm) => {
        const requiredType = req.type || 'ALL';
        return userPerm.name === req.permission && 
               (userPerm.type === 'ALL' || userPerm.type === requiredType);
      })
    );
  }

  private validateAndRequirement(
    roles: string[] | undefined,
    permissions: { permission: string; type?: string }[] | undefined,
    hasRequiredRoles: boolean,
    hasRequiredPermissions: boolean,
    userRoles: string[],
    userPermissions: { name: string; type: string }[]
  ): boolean {
    if (roles && !hasRequiredRoles) {
      throw new ForbiddenException(
        `User does not have required roles. Required: ${roles.join(", ")}. User has: ${userRoles.join(", ")}`
      );
    }
    if (permissions && !hasRequiredPermissions) {
      const permissionStrings = permissions.map(p => p.permission + "(" + (p.type || 'ALL') + ")");
      const userPermissionStrings = userPermissions.map(up => up.name + "(" + up.type + ")");
      throw new ForbiddenException(
        `User does not have required permissions. Required: ${permissionStrings.join(", ")}. User has: ${userPermissionStrings.join(", ")}`
      );
    }
    return true;
  }

  private validateOrRequirement(
    roles: string[] | undefined,
    permissions: { permission: string; type?: string }[] | undefined,
    hasRequiredRoles: boolean,
    hasRequiredPermissions: boolean,
    userRoles: string[],
    userPermissions: { name: string; type: string }[]
  ): boolean {
    const hasEither = hasRequiredRoles || hasRequiredPermissions;
    if (!hasEither) {
      const roleStr = roles ? `Roles: ${roles.join(", ")}` : "";
      const permStr = permissions 
        ? "Permissions: " + permissions.map(p => p.permission + "(" + (p.type || 'ALL') + ")").join(", ")
        : "";
      const requiredStr = [roleStr, permStr].filter(Boolean).join(" OR ");
      const userPermissionStrings = userPermissions.map(up => `${up.name}(${up.type})`);
      
      throw new ForbiddenException(
        `User does not have required access. Required: ${requiredStr}. User has - Roles: ${userRoles.join(", ")}, Permissions: ${userPermissionStrings.join(", ")}`
      );
    }
    return true;
  }
}
