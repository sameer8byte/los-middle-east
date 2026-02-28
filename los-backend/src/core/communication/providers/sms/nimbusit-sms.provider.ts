import { Injectable } from "@nestjs/common";
import {
  SmsMessage,
  SmsProvider,
} from "../../interfaces/sms-provider.interface";

@Injectable()
export class NimbusitSmsProvider implements SmsProvider {
  name = "nimbusit";
  private readonly user: string;
  private readonly authKey: string;
  private readonly sender: string;
  private readonly entityId: string;
  private readonly templateId: string;
  private readonly brand: string;
  private readonly email: string;

  constructor() {
    this.user = process.env.NIMBUSIT_USER;
    this.authKey = process.env.NIMBUSIT_AUTH_KEY;
    this.sender = process.env.NIMBUSIT_SENDER;
    this.entityId = process.env.NIMBUSIT_ENTITY_ID;
    this.templateId = process.env.NIMBUSIT_TEMPLATE_ID;
    this.brand = process.env.NIMBUSIT_BRAND || "";
    this.email = process.env.NIMBUSIT_EMAIL || "";
  }

  async sendSms(message: SmsMessage): Promise<boolean> {
    try {
      if (
        !this.user ||
        !this.authKey ||
        !this.sender ||
        !this.entityId ||
        !this.templateId
      ) {
        return false;
      }
      const mobile = message.to.startsWith("+91")
        ? message.to.substring(3)
        : message.to;
      let text = "";
      if (this.brand === "Paisapop") {
        text = `http://nimbusit.net/api/pushsms?user=${this.user}&authkey=${
          this.authKey
        }&sender=${this.sender}&mobile=${mobile}&text=Dear customer, ${message.otp} is the OTP for your login at Paisapop. In case you have not requested this, please contact us at info@paisapop.com. Team Paisapop&entityid=${
          this.entityId
        }&templateid=${this.templateId}&rpt=1`;
      } else if (this.brand === "MinutesLoan") {
        text = `http://nimbusit.net/api/pushsms?user=${this.user}&authkey=${
          this.authKey
        }&sender=${this.sender}&mobile=${mobile}&text=Dear customer, ${
          message.otp
        } is the OTP for your login at ${
          this.brand
        }. In case you have not requested this, please contact us at ${
          this.email
        } Team ${this.brand}&entityid=${
          this.entityId
        }&templateid=${this.templateId}&rpt=1`;
      } else if (this.brand === "ZeptoFinance") {
        text = `http://nimbusit.net/api/pushsms?user=${this.user}&authkey=${
          this.authKey
        }&sender=${this.sender}&mobile=${mobile}&text=Dear customer, ${
          message.otp
        } is the OTP for your login at Zepto Finance. If you have not requested this, please contact us at ${
          this.email
        } .&entityid=${
          this.entityId
        }&templateid=${this.templateId}&rpt=1`;
      }else if(this.brand === "Salary4Sure"){
        text = `http://nimbusit.net/api/pushsms?user=${this.user}&authkey=${
          this.authKey
        }&sender=${this.sender}&mobile=${mobile}&text=Dear customer, ${
          message.otp
        } is the OTP for your login at Salary4Sure. In case you have not requested this, please contact us at ${
          this.email
        }&entityid=${
          this.entityId
        }&templateid=${this.templateId}&rpt=1`;
      }else if(this.brand === "FastSalary"){
        text = `http://nimbusit.net/api/pushsms?user=${this.user}&authkey=${
          this.authKey
        }&sender=${this.sender}&mobile=${mobile}&text=Dear customer, ${
          message.otp
        } is the OTP for your login at FastSalary. In case you have not requested this, please contact us at ${
          this.email
        } Team FastSalary&entityid=${
          this.entityId
        }&templateid=${this.templateId}&rpt=1`;
      }else if(this.brand === "SalaryBolt"){
        text = `http://nimbusit.net/api/pushsms?user=${this.user}&authkey=${  
          this.authKey
        }&sender=${this.sender}&mobile=${mobile}&text=Dear Customer, ${
          message.otp
        } is the OTP for your login at SalaryBolt. If you have not requested this, please contact us at ${
          this.email
        } .- Team SalaryBolt&entityid=${
          this.entityId
        }&templateid=${this.templateId}&rpt=1`; 
      }
      const response = await fetch(text);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(`NimbusIT SMS sent successfully to ${message.to}`);
      return true;
    } catch (error) {
      console.error(`NimbusIT SMS send failed: ${error.message}`);
      return false;
    }
  }
}
