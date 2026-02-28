import {
  IsEmail,
  IsString,
  IsOptional,
  IsDate,
  IsNumber,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { PartialType } from "@nestjs/mapped-types";

export class CreateUserDto {
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  brandId: string;

  @IsOptional()
  @IsString()
  googleId?: string;

  // brandSubDomainId
  @IsOptional()
  @IsString()
  brandSubDomainId?: string;

  // occupation_type_id
  @IsOptional()
  @IsNumber()
  occupation_type_id?: BigInt;

  // is_terms_accepted
  @IsOptional()
  @IsBoolean()
  is_terms_accepted?: boolean;

  // status_id
  @IsOptional()
  @IsNumber()
  status_id?: BigInt;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsNumber()
  onboardingStep?: number;

  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  isPhoneVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AllotUserToPartnerDto {
  @IsString()
  userId: string;

  @IsString()
  partnerUserId: string;
}

export class RelocateUserDto {
  @IsString()
  userId: string;

  @IsString()
  newPartnerUserId: string;
}

export class GetPartnerAllottedUsersDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  onboardingStep?: number;

  @IsOptional()
  @IsBoolean()
  kycCompleted?: boolean;

  @IsOptional()
  @IsString()
  accountStatus?: string;
}

export class BulkAllotUsersToPartnerDto {
  @IsString({ each: true })
  userIds: string[];

  @IsString()
  partnerUserId: string;
}
