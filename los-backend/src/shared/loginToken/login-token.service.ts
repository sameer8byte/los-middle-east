import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { JwtService, TokenPayload } from "src/core/jwt/jwt.service";
import { platform_type } from "@prisma/client";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;

@Injectable()
export class LoginTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // in case of web user id and in case of partner use partner user id
  async createTokens(
    userId: string,
    partnerUserId: string,
    email: string,
    deviceId: string,
    brandId: string,
    platformType: platform_type,
  ) {
    const payload: TokenPayload = { userId, partnerUserId, deviceId, brandId };

    const { accessToken, refreshToken } =
      this.jwtService.generateTokens(payload);

    const refreshExpiresInDays = parseInt(
      process.env.JWT_REFRESH_EXPIRES_DAYS || "30",
      10,
    );

    // const expiresAt = addDays(new Date(), refreshExpiresInDays);
    const expiresAt = _dayjs().add(refreshExpiresInDays, "day").toDate();

    if (platformType === platform_type.WEB) {
      await this.revokeWebTokens(payload.userId);
      await this.prisma.userLoginToken.create({
        data: {
          userId: userId,
          deviceId,
          accessToken,
          refreshToken,
          expiresAt,
        },
      });
    } else if (platformType === platform_type.PARTNER) {
      await this.revokePartnerTokens(email);
      await this.prisma.partnerLoginToken.create({
        data: {
          partnerUserId: partnerUserId,
          deviceId,
          accessToken,
          refreshToken,
          expiresAt,
        },
      });
    }
    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(
    token: string,
    platformType: platform_type = platform_type.WEB,
    doamin: string = "",
  ) {
    // remove beare from the token
    const refreshToken = token.startsWith("Bearer ")
      ? token.split(" ")[1]
      : token;

    const storedToken =
      platformType === platform_type.WEB
        ? await this.prisma.userLoginToken.findUnique({
            where: { refreshToken, isLoggedOut: false },
          })
        : await this.prisma.partnerLoginToken.findUnique({
            where: { refreshToken, isLoggedOut: false },
          });

    if (!storedToken || new Date() > storedToken.expiresAt) {
      throw new BadRequestException("Invalid or expired refresh token");
    }

    const payload = this.jwtService.verifyToken(refreshToken);

    if (!payload) throw new UnauthorizedException("Access token has expired");
    if (platformType === platform_type.WEB) {
      const currentDevice = await this.prisma.brand.findFirst({
        where: {
          // domain: doamin,
          brand_sub_domains:{
            some: { subdomain: doamin }
          }
        },
        select: {
          id: true,
        },
      });
      if (currentDevice?.id !== payload.brandId) {
        throw new UnauthorizedException("Brand not found");
      }
    }
    return payload;
  }

  async verifyAccessToken(
    token: string,
    platformType: platform_type = platform_type.WEB,
    domain: string = "",
  ) {
    try {
      const accessToken = token.startsWith("Bearer ")
        ? token.split(" ")[1]
        : token;
      const storedToken =
        platformType === platform_type.WEB
          ? await this.prisma.userLoginToken.findUnique({
              where: { accessToken, isLoggedOut: false },
            })
          : await this.prisma.partnerLoginToken.findUnique({
              where: { accessToken, isLoggedOut: false },
            });
      if (!storedToken) {
        throw new UnauthorizedException("Invalid or expired access token");
      }

      const payload = this.jwtService.verifyToken(accessToken);

      if (!payload) throw new UnauthorizedException("Access token has expired");

      if (platformType === platform_type.WEB) {
        const currentDevice = await this.prisma.brand.findFirst({
          where: {
            brand_sub_domains:{
              some: { subdomain: domain }
            }
            // domain: domain,
          },
          select: {
            id: true,
          },
        });
        if (currentDevice.id !== payload.brandId) {
          throw new UnauthorizedException("Brand not found");
        }
      }
      return payload;
    } catch (error) {
      throw new UnauthorizedException(
        error.message || "Access token has expired",
      );
    }
  }

  async revokeWebTokens(id: string) {
    await this.prisma.userLoginToken.updateMany({
      where: {
        userId: id,
      },
      data: {
        isLoggedOut: true,
      },
    });
  }

  async revokePartnerTokens(email: string) {
    await this.prisma.partnerLoginToken.updateMany({
      where: {
        partner_user: {
          email: email,
        },
      },
      data: {
        isLoggedOut: true,
      },
    });
  }

  async refreshTokens(
    refreshToken: string = "",
    platformType: platform_type = platform_type.WEB,
    domain: string = "",
  ) {
    const payload = await this.verifyRefreshToken(
      refreshToken,
      platformType,
      domain,
    );
    // paylod
    const newAccessToken = this.jwtService.generateAccessTokens(payload);
    // newAccessToken
    if (platformType === platform_type.WEB) {
      await this.prisma.userLoginToken.updateMany({
        where: {
          userId: payload.userId,
          deviceId: payload.deviceId,
          isLoggedOut: false,
        },
        data: {
          accessToken: newAccessToken,
        },
      });
    } else {
      await this.prisma.partnerLoginToken.updateMany({
        where: {
          partnerUserId: payload.partnerUserId,
          deviceId: payload.deviceId,
          isLoggedOut: false,
        },
        data: {
          accessToken: newAccessToken,
        },
      });
    }
    return { accessToken: newAccessToken, refreshToken };
  }
}
