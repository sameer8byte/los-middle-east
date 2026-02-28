import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class LeadDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  // 📱 Indian mobile number: exactly 10 digits
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile number must be a valid 10-digit Indian number',
  })
  mobile: string;

  // 🪪 PAN: ABCDE1234F
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: 'PAN number must be in valid format (ABCDE1234F)',
  })
  pan: string;

  @IsString()
  @IsOptional()
  loan_type?: string;

  @IsNumber()
  @IsOptional()
  loan_amount?: number;

  @IsString()
  @IsOptional()
  masked_aadhaar?: string;

  @IsNumber()
  @IsOptional()
  loan_tenure_months?: number;

  @IsString()
  @IsOptional()
  loan_purpose?: string;

  @IsString()
  @IsOptional()
  employment_type?: string;

  @IsString()
  @IsOptional()
  company_name?: string;

  @IsNumber()
  @IsOptional()
  monthly_income?: number;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsString()
  @IsOptional()
  date_of_birth?: string;

  @IsString()
  @IsOptional()
  gender?: string;
}

export class CreateLeadRequestDto {
  @ValidateNested()
  @Type(() => LeadDto)
  @IsNotEmpty()
  lead: LeadDto;

  @IsString()
  @IsOptional()
  brandId?: string;
}