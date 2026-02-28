import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { EvaluationV2Service } from "./evaluation.service.v2";
import { AuthType } from "src/common/decorators/auth.decorator";
import { EligibilityStatusEnum } from "@prisma/client";

@AuthType("partner")
@Controller("partner/brand/:brandId/evaluation-v2")
export class EvaluationV2Controller {
  constructor(private readonly evaluationV2Service: EvaluationV2Service) {}

  @Post(":userId/:loanId/upsert")
  async upsertEvaluateByLoanId(
    @Param("userId") userId: string,
    @Param("brandId") brandId: string,
    @Param("loanId") loanId: string
  ) {
    return this.evaluationV2Service.upsertEvaluateByLoanId(
      loanId,
      userId,
      brandId
    );
  }

  @Get(":userId/:loanId")
  async getEvaluationByLoanId(
    @Param("userId") userId: string,
    @Param("loanId") loanId: string,
    @Param("brandId") brandId: string
  ) {
    return this.evaluationV2Service.syncAllStages(loanId, userId, brandId);
  }

  @Put(":evaluationId/item/:itemId")
  async updateEvaluationItem(
    @Param("evaluationId") evaluationId: string,
    @Param("itemId") itemId: string,
    @Param("brandId") brandId: string,

    @Body()
    data: {
      actualValue?: string;
      status?: EligibilityStatusEnum;
      override?: boolean;
      comments?: string;
    }
  ) {
    return this.evaluationV2Service.updateEvaluationItem(
      evaluationId,
      itemId,
      data
    );
  }
}
