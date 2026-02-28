import { IsString, IsNotEmpty } from "class-validator";

export class GlobalSearchDto {
  @IsString()
  @IsNotEmpty()
  search: string;
}
