// src/user-device/dto/create-user-device.dto.ts
import { IsString, IsOptional, IsEnum } from "class-validator";
import { platform_type } from "@prisma/client";

export class CreateUserDeviceDto {
  @IsString()
  fpId: string;

  @IsOptional()
  @IsString()
  brandId: string | null;

  @IsString()
  lastActiveAt: Date;

  @IsString()
  deviceType: string;

  @IsOptional()
  @IsString()
  os?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  fcmToken?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsEnum(platform_type)
  @IsOptional()
  platformType: platform_type;
}
