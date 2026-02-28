// src/communication/interfaces/sms-provider.interface.ts
export interface SmsMessage {
  to: string;
  text: string;
  otp: string; // Optional OTP field
  name: string; // Optional name field
}

export interface SmsProvider {
  name: string;
  sendSms(message: SmsMessage): Promise<boolean>;
}
