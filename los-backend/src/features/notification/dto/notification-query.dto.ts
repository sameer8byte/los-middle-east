import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { notification_priority_enum } from '@prisma/client';

export class NotificationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;

  @IsOptional()
  @IsEnum(notification_priority_enum)
  priority?: notification_priority_enum;

  @IsOptional()
  @IsString()
  readStatus?: string;

  @IsOptional()
  @IsString()
  acknowledgedStatus?: string;

  @IsOptional()
  @IsString()
  dateRange?: string;
}
