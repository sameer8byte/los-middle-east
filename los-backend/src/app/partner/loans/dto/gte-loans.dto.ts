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
  loanAgreementStatus?: string;
}
