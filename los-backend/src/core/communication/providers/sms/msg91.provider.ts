import { Injectable, HttpException, BadRequestException } from "@nestjs/common";
import {
  SmsMessage,
  SmsProvider,
} from "../../interfaces/sms-provider.interface";
import { firstValueFrom } from "rxjs";
import { HttpService } from "@nestjs/axios";

@Injectable()
export class Msg91SmsProvider implements SmsProvider {
  name = "msg91";
  private readonly templateId: string;
  private readonly authKey: string;
  private readonly url: string;

  constructor(private readonly httpService: HttpService) {
    this.templateId = process.env.MSG91_TEMPLATE_ID;
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.url  =process.env.MSG91_URL ;
  }

  async sendSms(message: SmsMessage): Promise<boolean> {
    try {
      if (!this.templateId || !this.authKey || !this.url) {
        return false;
      }
      const payload = {
        template_id: this.templateId,
        short_url: "0", // enable short URL
        recipients: [
          {
            mobiles: message.to, // Msg91 requires a single recipient
            var1: message.name || "User", // Default to "User" if name is not provided
            var2: message.otp,
          },
        ],
      };
      const headers = {
        authkey: this.authKey,
        "Content-Type": "application/json",
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.url}/api/v5/flow`,
          payload,
          {
            headers,
          }
        )
      );
       return response.data && response.data.type === "success";
    } catch (error) {
      console.error(`Msg91 SMS failed: ${error.message}`);
      return false;
    }
  }
}
