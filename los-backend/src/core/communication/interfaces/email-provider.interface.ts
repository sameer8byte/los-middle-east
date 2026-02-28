export interface EmailMessage {
  to: string | string[];
  name: string; // Optional name field
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    content?: string | Buffer;
    mime_type?: string; // Optional MIME type for the attachment
    contentType?: string;
  }[];
  variables?: Record<string, string>; // Optional variables for templating
}

export interface EmailProvider {
  name: string;
  sendEmail(message: EmailMessage): Promise<boolean>;
}
