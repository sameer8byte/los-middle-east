import { Module } from "@nestjs/common";
import { EquifaxModule } from "src/external/equifax/equifax.module";
import { PrismaService } from "src/prisma/prisma.service";
import { CirProV2Module } from "src/external/cirProV2/cirProV2.module";
import { AwsModule } from "src/core/aws/aws.module";
import { EquifixBreService } from "./services/equifix.bre.service";
import { CirProV2BreController } from "./controller/cirProv2.bre.controller";
import { EquifixBreController } from "./controller/equifix.bre.controller";
import { CirProV2BreService } from "./services/cirProV2.bre.service";

@Module({
  imports: [
    EquifaxModule,
    CirProV2Module.register({
      baseUrl: process.env.CIR_PRO_V2_BASE_URL,
      userId: process.env.CIR_PRO_V2_USER_ID,
      password: process.env.CIR_PRO_V2_PASSWORD,
      customerId: process.env.CIR_PRO_V2_CUSTOMER_ID,
      customerName:
        process.env.CIR_PRO_V2_CUSTOMER_NAME ||
        "Naman Finlease Private Limited",
      contentType: process.env.CIR_PRO_V2_CONTENT_TYPE || "APPLICATION/JSON",
    }),
    AwsModule,
  ],
  controllers: [EquifixBreController, CirProV2BreController], // No controllers are defined in this module
  providers: [EquifixBreService, CirProV2BreService, PrismaService],
  exports: [EquifixBreService, CirProV2BreService], // Exporting the service for use in other modules
})
export class BreModule {}
