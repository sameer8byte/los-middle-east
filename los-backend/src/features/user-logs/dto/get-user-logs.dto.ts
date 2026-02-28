import { IsOptional, IsString, IsInt, Min, IsIn, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { UserLogType } from "@prisma/client";

export class GetUserLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  partnerUserId?: string;

  @IsOptional()
  @IsEnum(UserLogType)
  type?: UserLogType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsIn(["timestamp", "createdAt", "type"])
  sortBy?: string;

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}
