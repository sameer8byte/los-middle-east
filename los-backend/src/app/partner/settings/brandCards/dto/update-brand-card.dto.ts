import { IsString, IsUrl, IsOptional } from "class-validator";

export class UpdateBrandCardDto {
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
