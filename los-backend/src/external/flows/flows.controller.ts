import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  Get,
  Req,
  Res,
  Version,
  HttpCode,
} from "@nestjs/common";
import { FlowsService } from "./service/flows.service";
import { EncryptionService } from "./service/encryption.service";
import { WebhookService } from "./service/webhook.service";
import { WhatsAppTemplateService } from "./service/whatsapp-template.service";
import { FlowRequestDto } from "./dto/flow-request.dto";
import { AuthType } from "src/common/decorators/auth.decorator";
import { RedisService } from "src/core/redis/redis.service";

interface SessionData {
  phoneNumber: string;
  expiresAt: number;
}

@Controller("flows")
@AuthType("public")
export class FlowsController {
  private readonly logger = new Logger(FlowsController.name);
  private readonly SESSION_TTL = 86400; // 24 hours in seconds
  private readonly SESSION_PREFIX = 'whatsapp:session:'; 

  constructor(
    private readonly flowsService: FlowsService,
    private readonly encryptionService: EncryptionService,
    private readonly webhookService: WebhookService,
    private readonly whatsappTemplateService: WhatsAppTemplateService,
    private readonly redis: RedisService,
  ) {}

  @Get("health")
  healthCheck() {
    return { status: "healthy", timestamp: new Date().toISOString() };
  }

  // Webhook verification (GET)
  @Get()
  async getDefault(@Req() req, @Res() res) {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];

    if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      this.logger.log("Webhook verified successfully");
      return res.status(200).send(req.query["hub.challenge"]);
    }
    return res.sendStatus(403);
  }

  @Post()
  @Version("1")
  @HttpCode(200)
  async handleWebhook(@Body() body: any, @Req() req, @Res() res) {
    try {
      if (body.object === "whatsapp_business_account") {
        // Fire and forget - don't await these operations
        this.webhookService.processWebhook(body).catch(error => {
          this.logger.error('Error in webhook service:', error);
        });
        this.handleIncomingMessage(body).catch(error => {
          this.logger.error('Error handling incoming message:', error);
        });
        return res.sendStatus(200);
      }

      // Handle flow requests
      if (body.encrypted_flow_data && body.encrypted_aes_key && body.initial_vector) {
        const result = await this.handleFlowRequest(body);
        return res.status(200).send(result);
      }

      return res.sendStatus(200);
    } catch (error) {
      this.logger.error("Error processing webhook:", error);
      return res.sendStatus(200);
    }
  }

  private async handleIncomingMessage(body: any) {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;
      const contacts = value?.contacts;

      if (!messages?.length) return;

      const phoneNumberId = value.metadata.phone_number_id;
      const greetings = ["hii", "hi", "hello", "s4s", "salary4sure"];
      const userName = contacts?.[0]?.profile?.name || 'there';

      for (const message of messages) {
        const senderPhone = message.from;
        // Normalize phone number (919510473576 -> +919510473576)
        const normalizedPhone = senderPhone.startsWith('+') ? senderPhone : `+${senderPhone}`;

        if (message.type === "text") {
          const incomingText = message.text.body.toLowerCase().trim();
          if (greetings.includes(incomingText)) {
            // Capture phone number in database
            await this.captureUserPhone(normalizedPhone);
            // Send greeting message
            await this.whatsappTemplateService.sendTextMessage(normalizedPhone, `Hi ${userName}\nGlad to see you here.`);
            // Send loan journey template
            const flowToken = `LOAN_JOURNEY_${Date.now()}`;
            await this.redis.set(
              `${this.SESSION_PREFIX}${flowToken}`,
              normalizedPhone,
              this.SESSION_TTL,
            );
            await this.whatsappTemplateService.sendLoanJourneyTemplate(senderPhone, flowToken);
          }
        }

        if (message.type === "interactive" && message.interactive?.type === "nfm_reply") {
          const responseJson = message.interactive.nfm_reply.response_json;
          const flowToken = JSON.parse(responseJson).flow_token;
          
          if (flowToken?.startsWith('LOAN_APP_')) {
            await this.webhookService.handleLoanApplicationSubmission(senderPhone, responseJson);
          } else if (flowToken?.startsWith('LOAN_JOURNEY_')) {
            // Main flow completed - send AA consent or bank account template
            await this.handleFlowCompletion(senderPhone, responseJson);
          }
        }
      }
    } catch (error) {
      this.logger.error("Error handling incoming message:", error);
    }
  }

  private async captureUserPhone(phoneNumber: string) {
    try {
      await this.webhookService.getVerifiedUser(phoneNumber);
    } catch (error) {
      this.logger.error(`Error capturing user phone: ${error.message}`);
    }
  }

  private async handleFlowCompletion(senderPhone: string, responseJson: string) {
    try {
      const normalizedPhone = senderPhone.startsWith('+') ? senderPhone : `+${senderPhone}`;
      await this.flowsService.handleFlowCompletionWebhook(normalizedPhone, responseJson);
    } catch (error) {
      this.logger.error(`Error handling flow completion: ${error.message}`);
    }
  }

  private async handleFlowRequest(flowRequest: FlowRequestDto) {
    try {
      const decryptResult = this.encryptionService.decryptRequest(
        flowRequest.encrypted_flow_data,
        flowRequest.encrypted_aes_key,
        flowRequest.initial_vector,
      );

      const flowToken = decryptResult.decryptedData.flow_token;
      
      // Try to get phone from Redis session store
      if (flowToken) {
        const phoneNumber = await this.redis.get(`${this.SESSION_PREFIX}${flowToken}`);
        if (phoneNumber) {
          decryptResult.decryptedData.phone_number = phoneNumber;
          // Refresh TTL on each request
          await this.redis.expire(`${this.SESSION_PREFIX}${flowToken}`, this.SESSION_TTL);
        } else {
          this.logger.warn(`Session not found in Redis for token: ${flowToken}`);
        }
      }
      
      // If phone not in session, try to get from OTP verification (after phone is verified)
      if (!decryptResult.decryptedData.phone_number && decryptResult.decryptedData.data?.phone_number) {
        decryptResult.decryptedData.phone_number = decryptResult.decryptedData.data.phone_number;
      }

      let response: any;

      switch (decryptResult.decryptedData.action) {
        case "ping":
          response = await this.flowsService.handlePing(decryptResult.decryptedData);
          break;
        case "INIT":
          response = await this.flowsService.handleInit(decryptResult.decryptedData);
          break;
        case "data_exchange":
          response = await this.flowsService.handleDataExchange(decryptResult.decryptedData);
          break;
        case "BACK":
          response = await this.flowsService.handleBack(decryptResult.decryptedData);
          break;
        default:
          response = await this.flowsService.handleUnknownAction(decryptResult.decryptedData);
      }

      return this.encryptionService.encryptResponse(
        response,
        decryptResult.aesKey,
        flowRequest.initial_vector,
      );
    } catch (error) {
      this.logger.error("Error processing flow request:", error);
      throw new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}