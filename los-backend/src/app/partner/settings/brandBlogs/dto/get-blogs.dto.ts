import { IsOptional, IsEnum, IsString, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { BlogStatus } from "./create-blog.dto";

export class GetBlogsDto {
  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

