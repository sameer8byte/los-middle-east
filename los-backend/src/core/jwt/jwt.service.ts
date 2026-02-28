// src/jwt/jwt.service.ts
import { Injectable } from "@nestjs/common";
import { JwtService as NestJwtService } from "@nestjs/jwt";

export interface TokenPayload {
  [key: string]: any; // Allow for additional custom fields
}

@Injectable()
export class JwtService {
  constructor(private readonly jwtService: NestJwtService) {}

  /**
   * Verify and decode a JWT token
   * @param token The token to verify
   * @returns The decoded token payload
   */
  verifyToken(token: string): TokenPayload {
    const bearerToken = token.startsWith("Bearer ")
      ? token.split(" ")[1]
      : token;

    return this.jwtService.verify<TokenPayload>(bearerToken, {
      secret: process.env.JWT_SECRET,
      ignoreExpiration: false,
    });
  }
  /**
   * Generate access and refresh tokens
   * @param payload The payload to encode in the tokens
   * @returns Object containing access and refresh tokens
   */
  generateTokens(payload: TokenPayload): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = this.generateAccessTokens(payload);

    const refreshToken = this.generateRefreshTokens(payload);

    return { accessToken, refreshToken };
  }

  // generate access token
  generateAccessTokens(payload: TokenPayload): string {
    // Set expiration based on user type
    const expiresIn = payload.userId ? "1h" : "24h"; // 1 hour for regular users, 24 hours for partner users
    
    const accessToken = this.jwtService.sign(
      {
        userId: payload.userId || undefined,
        partnerUserId: payload.partnerUserId || undefined,
        deviceId: payload.deviceId,
        brandId: payload.brandId,
      },
      { expiresIn },
    );
    return accessToken;
  }

  // generate refresh token
  generateRefreshTokens(payload: TokenPayload): string {
    // Set refresh token expiration based on user type
    const expiresIn = payload.userId 
      ? (process.env.JWT_REFRESH_EXPIRATION || "7d")  // 7 days for regular users (or env variable)
      : "30d"; // 30 days for partner users
    
    const refreshToken = this.jwtService.sign(
      {
        userId: payload.userId || undefined,
        partnerUserId: payload.partnerUserId || undefined,
        deviceId: payload.deviceId,
        brandId: payload.brandId,
      },
      { expiresIn },
    );

    return refreshToken;
  }
}
