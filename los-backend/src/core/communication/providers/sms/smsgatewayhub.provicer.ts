import { Injectable } from "@nestjs/common";
import {
  SmsMessage,
  SmsProvider,
} from "../../interfaces/sms-provider.interface";
import { firstValueFrom } from "rxjs";
import { HttpService } from "@nestjs/axios";
import * as qs from "querystring";

@Injectable()
export class SmsGatewayHubSmsProvider implements SmsProvider {
  name = "smsgatewayhub";

  private readonly smsKey: string;
  private readonly senderId: string;
  private readonly channel: string;
  private readonly dcs: string;
  private readonly flashsms: string;
  private readonly route: string;
  private readonly template: string;

  constructor(private readonly httpService: HttpService) {
    this.smsKey = process.env.SMS_GETEWAY_HUB_API_KEY;
    this.senderId = process.env.SMS_GETEWAY_HUB_SENDER_ID;
    this.channel = process.env.SMS_GETEWAY_HUB_CHANNEL || "2";
    this.dcs = process.env.SMS_GETEWAY_HUB_DCS || "0";
    this.flashsms = process.env.SMS_GETEWAY_HUB_FLASHSMS || "0";
    this.route = process.env.SMS_GETEWAY_HUB_ROUTE || "1";
    this.template = process.env.SMS_GETEWAY_HUB_TEMPLATE;
  }

  async sendSms(message: SmsMessage): Promise<boolean> {
    try {
      if (
        !this.smsKey ||
        !this.senderId ||
        !this.channel ||
        !this.dcs ||
        !this.flashsms ||
        !this.route ||
        !this.template
      ) {
        return false;
      } 
      const mobileNumber = message.to.startsWith("+91")
        ? message.to.substring(3)
        : message.to;

      const text = this.template.replace("{{OTP}}", message.text);
      const queryParams = qs.stringify({
        APIKey: this.smsKey,
        senderid: this.senderId,
        channel: this.channel,
        DCS: this.dcs,
        flashsms: this.flashsms,
        number: mobileNumber,
        text,
        route: this.route,
      });

      const url = `https://www.smsgatewayhub.com/api/mt/SendSMS?${queryParams}`;

      const { data } = await firstValueFrom(this.httpService.post(url, {}));

      if (data?.ErrorCode !== "000" || data?.ErrorMessage !== "Success") {
        console.error("SMS Gateway Error:", data);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error sending SMS via SMSGatewayHub:`, error);
      return false;
    }
  }
}
