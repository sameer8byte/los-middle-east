import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { CommonAppService } from "./services/common.services";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { CommonAppController } from "./controller/common.controller";
import { CallMeRequestService } from "./services/callMeRequest.service";
import { CallMeRequestController } from "./controller/callMeRequest.controller";
import { UtmController } from "./controller/utm.controller";
import { UtmService } from "./services/utm.services";

@Module({
  imports: [PrismaModule],
  controllers: [CommonAppController, CallMeRequestController, UtmController],
  providers: [CommonAppService, AwsPublicS3Service, CallMeRequestService, UtmService],
  exports: [CommonAppService, CallMeRequestService, UtmService],
})
export class CommonAppModule {}
