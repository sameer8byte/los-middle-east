import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsInt,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { PermissionType } from "@prisma/client";

export class PermissionDto {
  @IsInt()
  permissionId: number;

  @IsEnum(PermissionType)
  permissionType: PermissionType;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional() // Make password optional for edit operations
  password?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsUUID()
  brandId: string;

  @IsInt()
  roleId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];

  @IsUUID()
  @IsOptional()
  reportsToId?: string;

  @IsBoolean()
  @IsOptional()
  isReloanSupport?: boolean;

  @IsBoolean()
  @IsOptional()
  is_fresh_loan_support?: boolean;
}
