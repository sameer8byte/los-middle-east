import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * EmailConfigService provides common email configuration
 * shared across all email providers (Zepto, Brevo, MSG91, etc.)
 * 
 * This service centralizes email configuration to avoid duplication
 * and ensures consistency across different email providers.
 * 
 * Environment Variables Required:
 * - EMAIL_FROM_NAME: The display name for outgoing emails
 * - EMAIL_FROM_ADDRESS: The email address for outgoing emails
 */
@Injectable()
export class EmailConfigService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get the common email from name used across all email providers
   * Uses the EMAIL_FROM_NAME environment variable
   */
  getFromName(): string {
    return this.configService.get<string>('EMAIL_FROM_NAME');
  }

  /**
   * Get the common email from address used across all email providers
   * Uses the EMAIL_FROM_ADDRESS environment variable
   */
  getFromAddress(): string {
    return this.configService.get<string>('EMAIL_FROM_ADDRESS');
  }
}
