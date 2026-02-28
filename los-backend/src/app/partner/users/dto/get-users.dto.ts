// get-customers.dto.ts
import { Type } from "class-transformer";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class GetUsersDto extends PaginationDto {
  @IsOptional()
  @Type(() => String)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  roleId?: number;

  @IsOptional()
  @Type(() => Number)
  permissionId?: number;
}
