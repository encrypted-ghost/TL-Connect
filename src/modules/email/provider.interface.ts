export interface EmailProviderOptions {
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

/**
 * Abstract Email Provider Interface
 * All future providers (Mailgun, SES, etc.) must implement this.
 */
export interface IEmailProvider {
  name: string;
  send(options: EmailProviderOptions): Promise<SendResult>;
}
