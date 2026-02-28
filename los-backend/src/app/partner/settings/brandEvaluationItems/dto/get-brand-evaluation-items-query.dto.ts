import { IsOptional, IsEnum, IsBoolean, IsString } from "class-validator";
import { EvaluationStage } from "./create-brand-evaluation-item.dto";

export class GetBrandEvaluationItemsQueryDto {
  @IsOptional()
  @IsEnum(EvaluationStage)
  stage?: EvaluationStage;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  parameter?: string;
}
