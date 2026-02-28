import { Module } from "@nestjs/common";
import { EvaluationController } from "./evaluation.controller";
import { EvaluationService } from "./evaluation.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { ReportsAggregatorService } from "./report.service";
import {ReportsAggregatorController} from "./report.controller";

@Module({
  imports: [PrismaModule],
  controllers: [EvaluationController, ReportsAggregatorController],
  providers: [EvaluationService, ReportsAggregatorService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
