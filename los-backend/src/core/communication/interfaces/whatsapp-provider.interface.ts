export interface WhatsAppProvider {
  name: string;
  sendWhatsAppMessage(message: WhatsAppMessage): Promise<{ success: boolean; response?: any; error?: string }>;
}

export interface WhatsAppMessage {
  to: string;
  templateName: string;
  message?: string;
  params?: Record<string, any>;
}