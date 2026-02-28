import { IsString, IsOptional, IsArray, ValidateNested, IsInt, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { notification_priority_enum, platform_type } from '@prisma/client';

class NotificationTargetDto {
  @IsString()
  partnerUserId: string;

  platform: platform_type;
}

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  loanId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  createdByPartnerId?: string;

  @IsOptional()
  @IsInt()
  partnerRoleId?: number;

  @IsOptional()
  @IsEnum(notification_priority_enum)
  priority?: notification_priority_enum;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationTargetDto)
  targets?: NotificationTargetDto[];
}
