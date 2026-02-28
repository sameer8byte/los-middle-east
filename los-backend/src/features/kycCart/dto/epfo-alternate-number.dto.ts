// src/epfo/dto/alternate-phone-history.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class AlternatePhoneHistoryDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  brandId: string;

  @IsNotEmpty()
  @IsString()
  mobileNumber: string; // The new field for the alternate number

  @IsOptional()
  @IsString()
  checkId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsBoolean()
  cacheOnly?: boolean;
}