import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_TYPE_KEY, AuthTypeEnum } from "../decorators/auth.decorator";
import { platform_type } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { LoginTokenService } from "src/shared/loginToken/login-token.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly loginTokenService: LoginTokenService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const targetClass = context.getClass();

    const authType =
      this.reflector.get<AuthTypeEnum | AuthTypeEnum[]>(
        AUTH_TYPE_KEY,
        handler,
      ) ??
      this.reflector.get<AuthTypeEnum | AuthTypeEnum[]>(
        AUTH_TYPE_KEY,
        targetClass,
      );

    const request = context.switchToHttp().getRequest();

    // Handle array of auth types
    if (Array.isArray(authType)) {
      return await this.validateMultipleAuthTypes(request, authType);
    }

    // Handle single auth type (backward compatibility)
    switch (authType) {
      case "public":
        return true;

      case "web":
        return await this.validateWebUser(request);

      case "partner":
        return await this.validatePartner(request);

      case "api-key":
        return await this.validateApiKey(request);

      default:
        throw new UnauthorizedException(
          "Unknown authentication type in AuthGuard",
        );
    }
  }

  private async validateMultipleAuthTypes(
    request: any,
    authTypes: AuthTypeEnum[],
  ): Promise<boolean> {
    // If public is one of the auth types, allow access immediately
    if (authTypes.includes("public")) {
      return true;
    }

    const lastError: Error[] = [];

    // Try each authentication type in order
    for (const authType of authTypes) {
      try {
        switch (authType) {
          case "web":
            await this.validateWebUser(request);
            return true;
          case "partner":
            await this.validatePartner(request);
            return true;
          case "api-key":
            await this.validateApiKey(request);
            return true;
        }
      } catch (error) {
        lastError.push(error);
        // Continue to next auth type
      }
    }

    // If we get here, all auth types failed
    throw new UnauthorizedException(
      `Authentication failed for all supported types: ${authTypes.join(", ")}`,
    );
  }

  private async validateWebUser(request: any): Promise<boolean> {
    try {
      const authorization = request.headers["authorization"];
      const doamin = request.headers["domain"];

      if (!authorization) {
        throw new UnauthorizedException("User not authenticated");
      }
      const token = await this.loginTokenService.verifyAccessToken(
        authorization,
        platform_type.WEB,
        doamin,
      );
      if (!token) {
        return false;
      }
      const device = await this.prisma.devices.findUnique({
        where: {
          id: token.deviceId,
        },
      });
      if (!device) {
        throw new UnauthorizedException("Device not found");
      }

      request.user = {
        id: token.userId,
        deviceId: token.deviceId,
        brandId: token.brandId,
        platformType: platform_type.WEB,
      };
      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  private async validatePartner(request: any): Promise<boolean> {
    const authorization = request.headers["authorization"];

    if (!authorization) {
      throw new UnauthorizedException("User not authenticated");
    }
    // check token is valid
    const domain = request.headers["domain"];
    const token = await this.loginTokenService.verifyAccessToken(
      authorization,
      platform_type.PARTNER,
      domain,
    );
    if (!token) {
      return false;
    }
    const device = await this.prisma.devices.findUnique({
      where: {
        id: token.deviceId,
      },
    });
    if (!device) {
      throw new UnauthorizedException("Device not found");
    }
    // check user is active
    const user = await this.prisma.partnerUser.findUnique({
      where: {
        id: token.partnerUserId,
        isActive: true,
      },
      include: {
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
        userPermissions: {
          include: {
            partnerPermission: true,
          },
        },
      },
    });
    if (!user) {
      console.error("User not found or inactive", {
        partnerUserId: token.partnerUserId,
        deviceId: token.deviceId,
        brandId: token.brandId,
      });
      throw new UnauthorizedException("User not found");
    }
    
    // Collect all roles from both global and brand roles
    const roles = [
      ...user.globalRoles.map((gr) => gr.role.name),
      ...user.brandRoles.map((br) => br.role.name),
    ];
    
    // Collect all permissions with their types
    const permissions = user.userPermissions.map((up) => ({
      name: up.partnerPermission.name,
      type: up.partnerPermissionType,
    }));
    
    request.partnerUser = {
      id: token.partnerUserId,
      deviceId: token.deviceId,
      brandId: token.brandId || null,
      platformType: platform_type.PARTNER,
      roles: roles,
      permissions: permissions,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
    };
    return true;
  }

  private async validateApiKey(request: any): Promise<boolean> {
    try {
      const apiKey = request.headers["x-api-key"];

      if (!apiKey) {
        throw new UnauthorizedException("API key is required");
      }

      // Find the API key in the database
      const brandApiKey = await this.prisma.brand_api_keys.findUnique({
        where: { key: apiKey },
        include: { brand: true },
      });

      if (!brandApiKey) {
        throw new UnauthorizedException("Invalid API key");
      }

      // Check if the API key is active
      if (!brandApiKey.is_active) {
        throw new UnauthorizedException("API key is disabled");
      }

      // Check if the API key has expired
      if (brandApiKey.expires_at && brandApiKey.expires_at < new Date()) {
        throw new UnauthorizedException("API key has expired");
      }

      // Update last used timestamp
      await this.prisma.brand_api_keys.update({
        where: { id: brandApiKey.id },
        data: { last_used_at: new Date() },
      });

      // Attach API key authentication information to the request
      request.apiKeyData = {
        brandId: brandApiKey.brand_id,
        brand_id: brandApiKey.brand_id,
        brandName: brandApiKey.brand.name,
        apiKeyName: brandApiKey.name,
        platformType: "api-key",
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(error?.message || "API key validation failed");
    }
  }
}
