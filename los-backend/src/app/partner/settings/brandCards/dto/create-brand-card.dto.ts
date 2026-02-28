import { IsString, IsNotEmpty, IsUrl, IsOptional } from "class-validator";

export class CreateBrandCardDto {
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
