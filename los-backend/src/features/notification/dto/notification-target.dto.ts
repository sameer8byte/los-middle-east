import { IsString, IsEnum } from 'class-validator';
import { platform_type } from '@prisma/client';

export class NotificationTargetDto {
  @IsString()
  partnerUserId: string;

  @IsEnum(platform_type)
  platform: platform_type;
}
