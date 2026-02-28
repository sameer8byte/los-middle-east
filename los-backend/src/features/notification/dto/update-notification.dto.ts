import { notification_priority_enum } from '@prisma/client';
import { IsString, IsOptional, IsInt, IsEnum, IsDateString } from 'class-validator';

export class UpdateNotificationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  loanId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

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
}
