import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateBrandSubDomainDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  @IsNotEmpty()
  brandId: string;

  @IsString()
  @IsNotEmpty()
  subdomain: string;

  // marketingSource
  @IsString()
  @IsOptional()
  marketingSource?: string;

  //isPrimary
  @IsOptional()
  isPrimary?: boolean = false;  

  // isDisabled
  @IsOptional()
  isDisabled?: boolean = false;   
}

export class UpdateBrandSubDomainDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  subdomain?: string;

  // marketingSource
  @IsString()
  @IsOptional()
  marketingSource?: string;
  
  //isPrimary
  @IsOptional()
  isPrimary?: boolean;  

  // isDisabled
  @IsOptional()
  isDisabled?: boolean; 
} 
