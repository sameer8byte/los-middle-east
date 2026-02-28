import { Type } from "class-transformer";
import { IsOptional } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class GetCollectionDto extends PaginationDto {
  @IsOptional()
  @Type(() => String)
  status?: string;

  @IsOptional()
  @Type(() => String)
  search?: string;

  @IsOptional()
  @Type(() => String)
  assignedCollectionExecutive?: string;

  @IsOptional()
  @Type(() => String)
  assignedCollectionSupervisor?: string;
}
