import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { EvaluationService } from "./evaluation.service";
import { AuthType } from "src/common/decorators/auth.decorator";

@AuthType("partner")
@Controller("partner/brand/:brandId/evaluation")
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  // evaluation.controller.ts
  @Post(":userId/upsert")
  upsertEvaluation(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Body() body: any, // Adjust the type as per your DTO
  ) {
    return this.evaluationService.upsertEvaluation(
      brandId,
      userId,
      body.loanId,
    );
  }

  @Get(":userId/evaluation/:evaluationId")
  getEvaluation(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Param("evaluationId") evaluationId: string,
  ) {
    return this.evaluationService.getEvaluationById(evaluationId);
  }

  //updateEvaluationItem
  @Post(":userId/evaluation/:evaluationId/updateEvaluationItem")
  updateEvaluationItem(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Param("evaluationId") evaluationId: string,
    @Body()
    body: {
      id: string;
      status: "ELIGIBLE" | "NOT_ELIGIBLE";
      override: boolean;
      comments: string | null;
    }, // Adjust the type as per your DTO
  ) {
    return this.evaluationService.updateEvaluationItem(
      evaluationId,
      body.id,
      body,
    );
  }
}
