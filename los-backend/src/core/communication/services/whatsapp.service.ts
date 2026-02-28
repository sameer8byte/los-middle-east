// src/communication/services/whatsapp.service.ts
import { Injectable, Logger } from "@nestjs/common";
import {
  WhatsAppMessage,
  WhatsAppProvider,
} from "../interfaces/whatsapp-provider.interface";

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly providers: WhatsAppProvider[]) {}

  async sendWhatsAppMessage(message: WhatsAppMessage): Promise<boolean> {
    // Validate phone number
    if (!message.to || message.to.trim() === "") {
      this.logger.error("No recipient specified for WhatsApp message");
      return false;
    }

    // Validate template name
    if (!message.templateName || message.templateName.trim() === "") {
      this.logger.error("No template name specified for WhatsApp message");
      return false;
    }

    this.logger.log(
      `Preparing to send WhatsApp message to ${message.to} using template: ${message.templateName}`,
    );

    for (const provider of this.providers) {
      this.logger.log(
        `Attempting to send WhatsApp message via ${provider.name} to ${message.to}`,
      );

      try {
        const result = await provider.sendWhatsAppMessage(message);

        if (result.success) {
          this.logger.log(
            `WhatsApp message sent successfully via ${provider.name} to: ${message.to}`,
          );
          return true;
        }

        this.logger.warn(
          `Failed to send WhatsApp message via ${provider.name} to ${message.to}: ${result.error || "Unknown error"}, trying next provider if available`,
        );
      } catch (error) {
        this.logger.error(
          `Exception occurred while sending WhatsApp message via ${provider.name}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    this.logger.error(
      `All WhatsApp providers failed to send message to ${message.to}`,
    );
    return false;
  }
}
