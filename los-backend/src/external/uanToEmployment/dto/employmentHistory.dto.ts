import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EmploymentHistoryDto {
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

    
  @IsOptional()
  @IsBoolean()
  cacheOnly?: boolean;
}