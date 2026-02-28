// src/brands/dto/update-brand-details.dto.ts

import { IsString, IsEmail, IsNotEmpty, IsOptional } from "class-validator";

export class UpdateBrandDetailsDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;

  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @IsString()
  @IsOptional()
  website: string;

  @IsString()
  @IsOptional()
  gstNumber: string;

  @IsString()
  @IsOptional()
  cinNumber: string;

  @IsString()
  @IsOptional()
  rbiRegistrationNo: string;


  @IsString()
  @IsOptional()
  lenderName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  title?: string;
}
