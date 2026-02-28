// get-customers.dto.ts
import { Type } from "class-transformer";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class GetLoansDto extends PaginationDto {
  @IsOptional()
  @Type(() => String)
  status?: string;

  @IsOptional()
  @Type(() => String)
  search?: string;

  @IsOptional()
  @Type(() => String)
  pSenctionStatus?: string;

  @IsOptional()
  @Type(() => String)
  loanAgreementStatus?: string;

  @IsOptional()
  @Type(() => String)
  opsStatus?: string;

    @IsOptional()
  @Type(() => String)
  assignedSupervisor?: string; 

  @IsOptional()
  @Type(() => String)
  assignedExecutive?: string; 

  @IsOptional()
  @Type(() => String)
  assignedCollectionExecutive?: string; 

  @IsOptional()
  @Type(() => String)
  assignedCollectionSupervisor?: string; 

  @IsOptional()
  @Type(() => String)
  loanType?: string; 

  @IsOptional()
  @Type(() => String)
  customDateFrom?: string;

  @IsOptional()
  @Type(() => String)
  customDateTo?: string;

  @IsOptional()
  @IsString()
  salaryMin?: string;

  @IsOptional()
  @IsString()
  salaryMax?: string;
}
