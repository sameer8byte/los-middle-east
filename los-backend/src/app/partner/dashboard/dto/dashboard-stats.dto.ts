import { IsOptional, IsString, IsDateString, IsIn } from "class-validator";
import { Transform } from "class-transformer";

export class DashboardStatsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString()?.toLowerCase())
  period?: "today" | "yesterday" | "week" | "month" | "year" | "all" | "custom" | "tilldate";

  @IsOptional()
  @IsString()
  @IsIn(['new', 'repeat', 'both'])
  @Transform(({ value }) => value?.toString()?.toLowerCase())
  loanFilterType?: "new" | "repeat" | "both";
}
