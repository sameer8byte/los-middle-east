import { Module } from "@nestjs/common";
import { WebhookService } from "./webhook.service";
import { WebhookController } from "./webhook.controller";

@Module({
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService], // in case you want to use it in other modules
})
export class WebhookModule {}
