import { IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CreateBrandEvaluationItemDto } from "./create-brand-evaluation-item.dto";

export class BulkUploadBrandEvaluationItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBrandEvaluationItemDto)
  items: CreateBrandEvaluationItemDto[];
}
