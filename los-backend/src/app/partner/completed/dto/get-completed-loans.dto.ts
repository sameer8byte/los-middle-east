import { IsOptional, IsString, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

export class GetCompletedLoansDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  status?: string; // JSON stringified array of statuses: "COMPLETED", "SETTLED"

  @IsOptional()
  @IsString()
  search?: string; // Search by customer name or loan ID

  @IsOptional()
  dateFilter?: string;
}
