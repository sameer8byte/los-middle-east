import { IsOptional, IsString, IsBoolean, IsDateString, IsEnum, IsNotEmpty } from 'class-validator';

export enum LeadFormStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  DUPLICATE = 'DUPLICATE'
}

export class CreateLeadFormDto {
  @IsNotEmpty()
  @IsString()
  brandId: string;

  @IsOptional()
  @IsDateString()
  createdTime?: Date;

  @IsOptional()
  @IsString()
  adId?: string;

  @IsOptional()
  @IsString()
  adName?: string;

  @IsOptional()
  @IsString()
  adsetId?: string;

  @IsOptional()
  @IsString()
  adsetName?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  campaignName?: string;

  @IsOptional()
  @IsString()
  formId?: string;

  @IsOptional()
  @IsString()
  formName?: string;

  @IsOptional()
  @IsBoolean()
  isOrganic?: boolean;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  areYouASalariedEmployee?: string;

  @IsOptional()
  @IsString()
  whatIsYourMonthlySalary?: string;

  @IsOptional()
  @IsString()
  enterYourPanNo?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  streetAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

export class QueryLeadFormsDto {
  @IsOptional()
  @IsString()
  page?: string = '1';

  @IsOptional()
  @IsString()
  limit?: string = '10';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(LeadFormStatus)
  status?: LeadFormStatus;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class UpdateLeadFormDto {
  @IsOptional()
  @IsEnum(LeadFormStatus)
  status?: LeadFormStatus;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}
