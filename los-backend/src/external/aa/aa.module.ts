import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AccountAggregatorService } from "./aa.service";
import { AccountAggregatorController } from "./controller/aa.controller";
import { AAWebhookController } from "./controller/aa.webhook.controller";
import { AADataExtractorService } from "./services/aa-data-extractor.service";
import { CommunicationModule } from "../../core/communication/communication.module";
import { AwsModule } from "../../core/aws/aws.module";

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 0,
    }),
    CommunicationModule,
    AwsModule,
  ],
  controllers: [AccountAggregatorController, AAWebhookController],
  providers: [AccountAggregatorService, AADataExtractorService],
  exports: [AccountAggregatorService, AADataExtractorService],
})
export class AAModule {}
