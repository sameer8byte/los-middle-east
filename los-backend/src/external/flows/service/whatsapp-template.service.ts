import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppTemplateService {
  private readonly logger = new Logger(WhatsAppTemplateService.name);

  constructor(private readonly configService: ConfigService) {}

  private getWhatsAppConfig() {
    const phoneNumberId = this.configService.get<string>('PHONE_NUMBER_ID');
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    
    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp configuration missing');
    }
    
    return { phoneNumberId, accessToken };
  }

  private async sendTemplate(phoneNumber: string, payload: any): Promise<void> {
    const { phoneNumberId, accessToken } = this.getWhatsAppConfig();
    
    await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber.replace('+', ''),
        ...payload,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  async sendLoanJourneyTemplate(phoneNumber: string, flowToken: string): Promise<void> {
    try {
      await this.sendTemplate(phoneNumber, {
        type: 'template',
        template: {
          name: 'salary4sure_prod_temp',
          language: { code: 'en' },
          components: [
            {
              type: 'button',
              sub_type: 'flow',
              index: '0',
              parameters: [
                {
                  type: 'action',
                  action: {
                    flow_token: flowToken,
                  },
                },
              ],
            },
          ],
        },
      });
    } catch (error) {
      this.logger.error(`Error sending loan journey template: ${error.message}`);
      throw error;
    }
  }

  async sendAAConsentTemplate(phoneNumber: string, redirectionUrl: string): Promise<void> {
    try {
      await this.sendTemplate(phoneNumber, {
        type: 'template',
        template: {
          name: 'aa_consent_temp_',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: redirectionUrl }],
            },
            {
              type: 'button',
              sub_type: 'quick_reply',
              index: '0',
              parameters: [{ type: 'payload', payload: 'AA_CONSENT_DONE' }],
            },
          ],
        },
      });
    } catch (error) {
      this.logger.error(`Error sending AA consent template: ${error.message}`);
      throw error;
    }
  }

  async sendBankAccountTemplate(phoneNumber: string): Promise<void> {
    try {
      await this.sendTemplate(phoneNumber, {
        type: 'template',
        template: {
          name: 'bank_account_temp',
          language: { code: 'en' },
        },
      });
    } catch (error) {
      this.logger.error(`Error sending bank account template: ${error.message}`);
      throw error;
    }
  }

  async sendImageTemplate(phoneNumber: string): Promise<void> {
    try {
      await this.sendTemplate(phoneNumber, {
        type: 'template',
        template: {
          name: 'image_template',
          language: { code: 'en' },
        },
      });
    } catch (error) {
      this.logger.error(`Error sending image template: ${error.message}`);
      throw error;
    }
  }

  async sendAadhaarTemplate(phoneNumber: string, verificationUrl: string): Promise<void> {
    try {
      await this.sendTemplate(phoneNumber, {
        type: 'template',
        template: {
          name: 'aadhaar_temp',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: verificationUrl }],
            },
            {
              type: 'button',
              sub_type: 'quick_reply',
              index: '0',
              parameters: [{ type: 'payload', payload: 'AADHAAR_DONE' }],
            },
          ],
        },
      });
    } catch (error) {
      this.logger.error(`Error sending Aadhaar template: ${error.message}`);
      throw error;
    }
  }

  async sendLoanApplicationTemplate(phoneNumber: string, flowToken: string): Promise<void> {
    try {
      await this.sendTemplate(phoneNumber, {
        type: 'template',
        template: {
          name: 'loan_application_template',
          language: { code: 'en' },
          components: [
            {
              type: 'button',
              sub_type: 'flow',
              index: '0',
              parameters: [
                {
                  type: 'action',
                  action: {
                    flow_token: flowToken,
                  },
                },
              ],
            },
          ],
        },
      });
    } catch (error) {
      this.logger.error(`Error sending loan application template: ${error.message}`);
      throw error;
    }
  }

  async sendConfirmationTemplate(phoneNumber: string): Promise<void> {
    try {
      await this.sendTemplate(phoneNumber, {
        type: 'template',
        template: {
          name: 'confirmation_temp',
          language: { code: 'en' },
        },
      });
    } catch (error) {
      this.logger.error(`Error sending confirmation template: ${error.message}`);
      throw error;
    }
  }

  async sendTextMessage(phoneNumber: string, text: string): Promise<void> {
    try {
      const { phoneNumberId, accessToken } = this.getWhatsAppConfig();
      
      await axios.post(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phoneNumber.replace('+', ''),
          type: 'text',
          text: { body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      this.logger.error(`Error sending text message: ${error.message}`);
      throw error;
    }
  }
}
