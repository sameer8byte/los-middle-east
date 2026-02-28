import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  EmailMessage,
  EmailProvider,
} from "../../interfaces/email-provider.interface";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { EmailConfigService } from "../../services/email-config.service";

@Injectable()
export class Msg91EmailProvider implements EmailProvider {
  name = "msg91";
  private readonly logger = new Logger(Msg91EmailProvider.name);

  private readonly templateId: string;
  private readonly authKey: string;
  private readonly domain: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly emailConfigService: EmailConfigService,
  ) {
    this.templateId = process.env.MSG91_EMAIL_TEMPLATE_ID;
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.domain = process.env.MSG91_DOMAIN;
    // Validate required environment variables
    if (
      !this.templateId ||
      !this.authKey ||
      !this.domain
    ) {
      throw new BadRequestException(
        "Missing required MSG91 email configuration environment variables.",
      );
    }
  }

  /**
   * Sends an email using the MSG91 Email API.
   */
  async sendEmail(message: EmailMessage): Promise<boolean> {
    try {
      this.logger.log(`Sending email via MSG91 to ${message.to}`);

      const payload = {
        recipients: [
          {
            to: [
              {
                email: message.to,
                name: message.name,
              },
            ],
            variables: message.variables || {},
          },
        ],
        from: {
          email: this.emailConfigService.getFromAddress(),
          name: this.emailConfigService.getFromName(),
        },
        domain: this.domain,
        template_id: this.templateId,
      };

      const headers = {
        authkey: this.authKey,
        "Content-Type": "application/json",
      };

      const { data } = await firstValueFrom(
        this.httpService.post(
          "https://control.msg91.com/api/v5/email/send",
          payload,
          { headers },
        ),
      );

      const success = data?.status?.toLowerCase() === "success";
      if (success) {
        this.logger.log(`✅ Email successfully sent to ${message.to}`);
      } else {
        this.logger.warn(
          `⚠️ MSG91 email send failed for ${message.to}: ${data?.message || "Unknown error"}`,
        );
      }

      return success;
    } catch (error) {
      this.logger.error(`❌ Failed to send email via MSG91 to ${message.to}`, error?.stack, {
        response: error?.response?.data,
      });
      return false;
    }
  }
}

