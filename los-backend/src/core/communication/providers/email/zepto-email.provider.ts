import { Injectable, Logger } from "@nestjs/common";
import {
  EmailMessage,
  EmailProvider,
} from "../../interfaces/email-provider.interface";
import { firstValueFrom } from "rxjs";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { EmailConfigService } from "../../services/email-config.service";

@Injectable()
export class ZeptoEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ZeptoEmailProvider.name);
  name = "zepto-mail";

  private readonly zeptoApiUrl: string;
  private readonly zeptoApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly emailConfigService: EmailConfigService,
  ) {
    this.zeptoApiUrl = this.configService.get<string>("ZEPTO_API_URL");
    this.zeptoApiKey = this.configService.get<string>("ZEPTO_API_KEY");
  }

  async sendEmail(message: EmailMessage): Promise<boolean> {
    try {
      this.logger.log(`Sending email to ${message.to}`);

      const payload = {
        from: {
          address: this.emailConfigService.getFromAddress(),
          name: this.emailConfigService.getFromName(),
        },
        to: [
          {
            email_address: {
              address: message.to,
              name: message.name,
            },
          },
        ],
        subject: message.subject,
        htmlbody: message.html,
        attachments:
          message?.attachments && message.attachments?.length > 0
            ? message.attachments.map((attachment) => ({
                name: attachment.filename,
                content: attachment.content,
                content_type:
                  attachment.contentType || "application/octet-stream",
                mime_type: attachment.mime_type || "application/octet-stream",
              }))
            : undefined,
      };

      await firstValueFrom(
        this.httpService.post(this.zeptoApiUrl, payload, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Zoho-enczapikey ${this.zeptoApiKey}`,
          },
        }),
      );

      this.logger.log(`✅ Email sent successfully to ${message.to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Failed to send email to ${message.to}`,
        error?.stack,
        {
          error: error?.response?.data || error.message,
        },
      );
      return false;
    }
  }
}
