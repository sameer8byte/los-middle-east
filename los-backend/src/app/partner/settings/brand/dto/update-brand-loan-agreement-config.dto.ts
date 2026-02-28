import { IsString, IsEmail, IsOptional, IsNotEmpty } from "class-validator";

export class UpdateBrandLoanAgreementConfigDto {
  // id 
  @IsString()
  @IsNotEmpty()
  id: string;
  
  // lender details
  @IsString()
  @IsNotEmpty()
  lenderName: string;

  @IsString()
  @IsOptional()
  lenderAddress?: string;

  @IsString()
  @IsOptional()
  nameOfDigitalLendingApplication?: string;

  @IsString()
  @IsOptional()
  nameOfLendingServiceProvider?: string;

  @IsString()
  @IsOptional()
  nameOfLoanServiceProviderRecoveryAgent?: string;

  @IsString()
  @IsOptional()
  sectionManagerName?: string;

  @IsString()
  @IsOptional()
  sectionManagerAddress?: string;

  @IsEmail()
  @IsOptional()
  sectionManagerEmail?: string;

  @IsString()
  @IsOptional()
  grievanceOfficerName?: string;

  @IsString()
  @IsOptional()
  grievanceOfficerAddress?: string;

  @IsEmail()
  @IsOptional()
  grievanceOfficerEmail?: string;

  @IsString()
  @IsOptional()
  grievanceOfficerPhone?: string;

  @IsString()
  @IsOptional()
  sectionManagerPhone?: string;

  // brandId
  @IsString()
  @IsNotEmpty()
  brandId: string;

  @IsString()
  @IsNotEmpty()
  nodalOfficerName: string;

  @IsString()
  @IsOptional()
  nodalOfficerAddress?: string;

  @IsEmail()
  @IsOptional()
  nodalOfficerEmail?: string;

  @IsString()
  @IsOptional()
  nodalOfficerPhone?: string;


}