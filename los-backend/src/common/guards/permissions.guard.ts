import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
 import { PrismaService } from "src/prisma/prisma.service";
import { PermissionsEnum } from "src/constant/permissions";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      (keyof typeof PermissionsEnum)[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const partnerUser = request.partnerUser;

    if (!partnerUser) {
      throw new ForbiddenException(
        "Partner user not found in request. Ensure AuthGuard is applied before PermissionsGuard.",
      );
    }

    // Get user permissions from database
    const userWithPermissions = await this.prisma.partnerUser.findUnique({
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

    if (!userWithPermissions) {
      throw new ForbiddenException("User not found or inactive");
    }

    // Check if user has SUPER_ADMIN role (bypass permission checks)
    const allRoles = [
      ...userWithPermissions.globalRoles.map((gr) => gr.role.name),
      ...userWithPermissions.brandRoles.map((br) => br.role.name),
    ];

    if (allRoles.includes('SUPER_ADMIN')) {
      return true; // Super admin has all permissions
    }

    // Get user's permissions with their types
    const userPermissions = userWithPermissions.userPermissions.map((up) => ({
      name: up.partnerPermission.name,
      type: up.partnerPermissionType,
    }));

    if (userPermissions.length === 0) {
      throw new ForbiddenException("User has no permissions assigned");
    }

    // Check if user has any of the required permissions
    // For this basic guard, we'll check for ALL permission type by default
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.some(
        (userPerm) =>
          userPerm.name === permission &&
          userPerm.type === 'ALL'
      )
    );

    if (!hasPermission) {
      const userPermissionStrings = userPermissions.map(
        (up) => `${up.name}(${up.type})`
      );
      throw new ForbiddenException(
        `User does not have required permissions. Required: ${requiredPermissions.join(", ")} with ALL access. User has: ${userPermissionStrings.join(", ")}`,
      );
    }

    return true;
  }
}
