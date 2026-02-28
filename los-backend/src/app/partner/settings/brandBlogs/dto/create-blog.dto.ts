import { IsString, IsOptional, IsEnum, IsDateString } from "class-validator";

export enum BlogStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export class CreateBlogDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  content: string;

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

