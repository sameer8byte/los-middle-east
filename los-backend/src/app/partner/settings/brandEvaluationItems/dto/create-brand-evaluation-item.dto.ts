import { IsString, IsArray, IsBoolean, IsInt, IsOptional, IsEnum } from "class-validator";

export enum EvaluationStage {
  ONE = "ONE",
  TWO = "TWO",
  THREE = "THREE",
  FOUR = "FOUR",
}

export class CreateBrandEvaluationItemDto {
  @IsString()
  parameter: string;

  @IsString()
  requiredValue: string;

  @IsArray()
  @IsString({ each: true })
  sources: string[];

  @IsEnum(EvaluationStage)
  @IsOptional()
  stage?: EvaluationStage = EvaluationStage.ONE;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsInt()
  @IsOptional()
  priority?: number = 0;

  @IsString()
  @IsOptional()
  description?: string;
}
