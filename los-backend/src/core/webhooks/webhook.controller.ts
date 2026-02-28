import { Controller, Post, Body, Get, Param, Query } from "@nestjs/common";
import { WebhookService } from "./webhook.service";
import { AuthType } from "src/common/decorators/auth.decorator";

@Controller("webhook")
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @AuthType("public")
  @Get("stringee-answer")
  async getStringeeWebhook(
    @Query()
    query: {
      from: string;
      to: string;
      fromInternal: string; // It comes as string, parse boolean if needed
      userId: string;
      projectId: string;
      custom?: string;
      callId: string;
      videocall: string; // parse boolean if needed
    },
  ) {
    // If needed, parse string booleans to actual boolean values
    const processedQuery = {
      ...query,
      fromInternal: query.fromInternal === "true",
      videocall: query.videocall === "true",
    };

    return this.webhookService.StringeeAnswer(processedQuery);
  }

  @AuthType("public")
  @Post("stringee-event")
  async postStringeeEvent(
    @Body() body: any, // Replace `any` with your DTO type if you have one
  ) {
    // Process the webhook data
    return this.webhookService.StringeeEvent(body);
  }

  @AuthType("public")
  @Post("stringee-recording/:userCallId")
  async postStringeeRecording(
    @Param("userCallId") userCallId: string,
    @Body()
    body: {
      start_time: string; // Unix timestamp in milliseconds as string
      end_time: string; // Unix timestamp in milliseconds as string
      recording_url: string;
      call_id: string;
      project_id: number;
      type: "recording";
      recordMessage: boolean;
    },
  ) {
    // Process the webhook data
    return this.webhookService.StringeeRecording(body, userCallId);
  }
}
