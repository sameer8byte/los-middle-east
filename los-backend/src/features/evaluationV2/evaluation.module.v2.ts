import { Module } from "@nestjs/common";
import { EvaluationV2Controller } from "./evaluation.controller.v2";
import { EvaluationV2Service } from "./evaluation.service.v2";
import { PrismaModule } from "src/prisma/prisma.module";
import { AAModule } from "src/external/aa/aa.module";
import { CartExtractorModule } from "src/external/cart/cart-extractor.module";
import { EquifaxModule } from "src/external/equifax/equifax.module";
import { CirProV2Module } from "src/external/cirProV2/cirProV2.module";

@Module({
  imports: [
    PrismaModule, 
    AAModule, 
    CartExtractorModule, 
    EquifaxModule,
    CirProV2Module.register({
      baseUrl: process.env.CIR_PRO_V2_BASE_URL,
      userId: process.env.CIR_PRO_V2_USER_ID,
      password: process.env.CIR_PRO_V2_PASSWORD,
      customerId: process.env.CIR_PRO_V2_CUSTOMER_ID,
      contentType: process.env.CIR_PRO_V2_CONTENT_TYPE || "APPLICATION/JSON",
      customerName:
        process.env.CIR_PRO_V2_CUSTOMER_NAME ||
        "Naman Finlease Private Limited",
    }),
  ],
  controllers: [EvaluationV2Controller],
  providers: [EvaluationV2Service],
  exports: [EvaluationV2Service],
})
export class EvaluationV2Module {}

