// src/appearance/dto/update-appearance.dto.ts
import { IsString, IsBoolean, IsOptional, IsNumber } from "class-validator";

export class UpdateAppearanceDto {
  @IsString()
  brandId: string;

  @IsString()
  primaryColor: string;

  @IsString()
  secondaryColor: string;

  @IsString()
  backgroundColor: string;

  @IsString()
  surfaceColor: string;

  @IsString()
  primaryTextColor: string;

  @IsString()
  secondaryTextColor: string;

  @IsString()
  successColor: string;

  @IsString()
  warningColor: string;

  @IsString()
  errorColor: string;

  @IsString()
  fontFamily: string;

  @IsNumber()
  baseFontSize: number;

  @IsBoolean()
  roundedCorners: boolean;

  @IsBoolean()
  darkMode: boolean;

  @IsOptional()
  @IsString()
  primaryHoverColor?: string;

  @IsOptional()
  @IsString()
  primaryFocusColor?: string;

  @IsOptional()
  @IsString()
  primaryActiveColor?: string;

  @IsOptional()
  @IsString()
  primaryLightColor?: string;

  @IsOptional()
  @IsString()
  primaryContrastColor?: string;

  @IsOptional()
  @IsString()
  secondaryHoverColor?: string;

  @IsOptional()
  @IsString()
  secondaryFocusColor?: string;

  @IsOptional()
  @IsString()
  secondaryActiveColor?: string;

  @IsOptional()
  @IsString()
  secondaryLightColor?: string;

  @IsOptional()
  @IsString()
  secondaryContrastColor?: string;

  @IsOptional()
  @IsString()
  surfaceTextColor?: string;

  @IsOptional()
  @IsString()
  backgroundTextColor?: string;
}
