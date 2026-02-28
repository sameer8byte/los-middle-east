// src/communication/services/email.service.ts
import { Injectable, Logger } from "@nestjs/common";
import {
  EmailMessage,
  EmailProvider,
} from "../interfaces/email-provider.interface";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly providers: EmailProvider[]) {}

  async sendEmail(message: EmailMessage): Promise<boolean> {
    // Normalize recipients for logging
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    const recipientCount = recipients.length;
    const recipientList = recipients.join(', ');
    
    // Validate recipients
    if (recipients.length === 0) {
      this.logger.error('No recipients specified for email');
      return false;
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      this.logger.error(`Invalid email addresses found: ${invalidEmails.join(', ')}`);
      return false;
    }
    
    this.logger.log(`Preparing to send email to ${recipientCount} recipient(s): ${recipientList}`);
    
    for (const provider of this.providers) {
      this.logger.log(`Attempting to send email via ${provider.name} to ${recipientCount} recipient(s)`);
      
      try {
        const success = await provider.sendEmail(message);

        if (success) {
          this.logger.log(`Email sent successfully via ${provider.name} to: ${recipientList}`);
          return true;
        }

        this.logger.warn(
          `Failed to send email via ${provider.name} to ${recipientCount} recipient(s), trying next provider if available`,
        );
      } catch (error) {
        this.logger.error(
          `Exception occurred while sending email via ${provider.name}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
    
    this.logger.error(`All email providers failed to send message to ${recipientCount} recipient(s): ${recipientList}`);
    return false;
  }
}
