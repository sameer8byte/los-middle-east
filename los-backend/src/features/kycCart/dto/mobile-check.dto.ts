// src/mobile-verification/dto/mobile-check.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MobileCheckDto {
  @IsNotEmpty()
  @IsString()
  mobileNo: string;

  @IsNotEmpty()
  @IsString()
  userId: string; 

  @IsNotEmpty()
  @IsString()
  brandId: string; 

  @IsOptional()
  @IsString()
  checkId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}
