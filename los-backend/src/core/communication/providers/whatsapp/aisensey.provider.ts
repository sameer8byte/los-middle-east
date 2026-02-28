import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import {
  WhatsAppMessage,
  WhatsAppProvider,
} from "../../interfaces/whatsapp-provider.interface";

@Injectable()
export class AisensyProvider implements WhatsAppProvider {
  name = "AiSensy";
  private readonly logger = new Logger(AisensyProvider.name);
  private readonly apiKey = process.env.AISENSY_API_KEY;
  private readonly baseUrl = process.env.AISENSY_BASE_URL;
  private readonly allowedDomains = ["backend.aisensy.com", "api.aisensy.com"];
  private readonly isConfigured: boolean;

  constructor() {
    if (!this.apiKey || !this.baseUrl) {
      this.logger.warn(
        "⚠️ AisensyProvider: AISENSY_API_KEY and AISENSY_BASE_URL not configured. WhatsApp provider will be skipped.",
      );
      this.isConfigured = false;
      return;
    }
    this.isConfigured = true;
    this.validateBaseUrl();
  }

  private validateBaseUrl(): void {
    try {
      const url = new URL(this.baseUrl);

      // Check protocol
      if (url.protocol !== "https:") {
        throw new Error("Only HTTPS protocol is allowed for AiSensy base URL");
      }

      // Check against allowlist
      if (!this.allowedDomains.includes(url.hostname)) {
        throw new Error(
          `Invalid AiSensy base URL domain. Allowed domains: ${this.allowedDomains.join(", ")}`,
        );
      }
    } catch (error) {
      this.logger.error(`Invalid AISENSY_BASE_URL: ${error.message}`);
      throw error;
    }
  }

  async sendWhatsAppMessage(
    message: WhatsAppMessage,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    try {
      this.logger.log(`Sending WhatsApp message to ${message.to} via AiSensy`);

      const endpoint = `${this.baseUrl}/campaign/t1/api/v2`;

      const payload = {
        apiKey: this.apiKey,
        campaignName: message.templateName,
        destination: this.formatPhone(message.to),
        userName: message.params?.name || "User",
        templateParams: message.params || [],
        media: message.params?.media || {},
        source: message.params?.source || "API",
      };

      // Log payload without sensitive data
      this.logger.log(
        `Payload: ${JSON.stringify({
          campaignName: payload.campaignName,
          destination: payload.destination,
          userName: payload.userName,
          templateParams: payload.templateParams,
          media: payload.media,
          source: payload.source,
        })}`,
      );

      const response = await axios.post(endpoint, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const success = response.status === 200 && !response.data?.error;

      if (success) {
        this.logger.log(
          `WhatsApp message sent successfully to ${message.to} via AiSensy`,
        );
        return { success: true, response: response.data };
      } else {
        this.logger.warn(`AiSensy response: ${JSON.stringify(response.data)} `);
        return {
          success: false,
          response: response.data,
          error: response.data?.message || "Unknown error",
        };
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || "Unknown error";
      this.logger.warn(`AiSensy error for ${message.to}: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        response: error.response?.data,
      };
    }
  }
  private formatPhone(phone: string): string {
    const cleaned = phone.split(/\D/).join("");
    return cleaned.length === 10 ? `91${cleaned}` : cleaned;
  }
}
