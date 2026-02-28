import { PartialType } from "@nestjs/mapped-types";
import { CreateBrandEvaluationItemDto } from "./create-brand-evaluation-item.dto";

export class UpdateBrandEvaluationItemDto extends PartialType(CreateBrandEvaluationItemDto) {}
