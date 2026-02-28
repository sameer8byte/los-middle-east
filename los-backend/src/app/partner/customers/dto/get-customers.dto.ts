import { Type, Transform } from "class-transformer";
import { IsOptional, IsNumber } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class GetCustomersDto extends PaginationDto {
  @Type(() => String)
  autoAllocationType?: string;

  @IsOptional()
  @Type(() => String)
  status?: string;

  @IsOptional()
  @Type(() => String)
  kycStatus?: string;

  @IsOptional()
  @Type(() => String)
  search?: string;

  @IsOptional()
  @Type(() => String)
  userReloanStatus?: string; 

  @IsOptional()
  @Type(() => String)
  allottedPartnerUserIds?: string; 

  @IsOptional()
  @Type(() => String)
  allottedSupervisorIds?: string; 

  @IsOptional()
  @Type(() => String)
  loanCount?: string; 

  @IsOptional()
  @Type(() => String)
  salaryRange?: string; 

  @IsOptional()
  @Type(() => String) // Keep it as a string to match service types
  salaryMin?: string;

  @IsOptional()
  @Type(() => String)
  salaryMax?: string;
  
}