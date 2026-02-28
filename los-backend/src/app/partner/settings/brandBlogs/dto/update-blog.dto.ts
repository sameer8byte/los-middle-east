import { IsString, IsOptional, IsEnum, IsDateString } from "class-validator";
import { BlogStatus } from "./create-blog.dto";

export class UpdateBlogDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  featuredImage?: string;

  @IsEnum(BlogStatus)
  @IsOptional()
  status?: BlogStatus;

  @IsDateString()
  @IsOptional()
  publishedDate?: string;
}

