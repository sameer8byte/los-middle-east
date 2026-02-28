import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { RoleEnum } from "src/constant/roles";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      (keyof typeof RoleEnum)[]
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const partnerUser = request.partnerUser;

    if (!partnerUser) {
      throw new ForbiddenException(
        "Partner user not found in request. Ensure AuthGuard is applied before RolesGuard."
      );
    }

    if (!partnerUser.roles || partnerUser.roles.length === 0) {
      throw new ForbiddenException("User has no roles assigned");
    }

    const hasRole = requiredRoles.some((role) =>
      partnerUser.roles.includes(role)
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `User does not have required roles. Required: ${requiredRoles.join(", ")}`
      );
    }

    return true;
  }
}
