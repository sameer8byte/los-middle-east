// src/communication/services/sms.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { SmsMessage, SmsProvider } from "../interfaces/sms-provider.interface";

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly providers: SmsProvider[]) {}

  async sendSms(message: SmsMessage): Promise<boolean> {
    for (const provider of this.providers) {
      this.logger.log(`Attempting to send SMS via ${provider.name}`);
      const success = await provider.sendSms(message);

      if (success) {
        this.logger.log(`SMS sent successfully via ${provider.name}`);
        return true;
      }

      this.logger.warn(
        `Failed to send SMS via ${provider.name}, trying next provider if available`,
      );
    }
    this.logger.error("All SMS providers failed to send the message");
    // throw new BadRequestException('failed to send SMS! Please try again later');
  }
}
