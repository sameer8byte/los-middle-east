import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  EmailMessage,
  EmailProvider,
} from "../../interfaces/email-provider.interface";
import { firstValueFrom } from "rxjs";
import { HttpService } from "@nestjs/axios";
import { EmailConfigService } from "../../services/email-config.service";

@Injectable()
export class BrevoEmailProvider implements EmailProvider {
  private readonly logger = new Logger(BrevoEmailProvider.name);
  name = "brevo-email";

  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly emailConfigService: EmailConfigService,
  ) {
    this.apiKey = process.env.BREVO_API_KEY;

    if (!this.apiKey) {
      throw new BadRequestException(
        "Missing required Brevo configuration: BREVO_API_KEY.",
      );
    }
  }

  async sendEmail(message: EmailMessage): Promise<boolean> {
    try {
      this.logger.log(`📤 Sending email via Brevo to ${message.to}`);

      const recipients = Array.isArray(message.to)
        ? message.to.map((email) => ({
            email,
            name: message.name,
          }))
        : [{ email: message.to, name: message.name }];

      const payload = {
        sender: {
          name: this.emailConfigService.getFromName(),
          email: this.emailConfigService.getFromAddress(),
        },
        to: recipients,
        subject: message.subject,
        htmlContent: message.html,
        ...(message.text && { textContent: message.text }),
        ...(message.attachments &&
          message.attachments.length > 0 && {
            attachment: message.attachments.map((attachment) => ({
              name: attachment.filename,
              content: attachment.content,
              mime_type:
                attachment.mime_type || "application/octet-stream",
            })),
          }),
      };

      const { data } = await firstValueFrom(
        this.httpService.post("https://api.brevo.com/v3/smtp/email", payload, {
          headers: {
            accept: "application/json",
            "api-key": this.apiKey,
            "content-type": "application/json",
          },
        }),
      );

      this.logger.log(`✅ Email sent successfully via Brevo`, {
        to: message.to,
        messageId: data?.messageId,
      });

      return true;
    } catch (error) {
      this.logger.error(
        `❌ Failed to send email via Brevo to ${message.to}`,
        error?.stack,
        { error: error?.response?.data || error.message },
      );
      return false;
    }
  }
}
