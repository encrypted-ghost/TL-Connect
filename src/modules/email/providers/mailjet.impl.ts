import type { IEmailProvider, EmailProviderOptions, SendResult } from '../provider.interface';
import Mailjet from 'node-mailjet';
import { env } from '../../../config/env.config';

export interface MailjetCredentials {
  apiKey?: string;
  apiSecret?: string;
}

export class MailjetEmailProvider implements IEmailProvider {
  name = 'mailjet';
  private client: Mailjet | null = null;
  private apiKey: string;
  private apiSecret: string;

  constructor(credentials?: MailjetCredentials) {
    this.apiKey = credentials?.apiKey || env.MAILJET_API_KEY || process.env.MAILJET_API_KEY || '';
    this.apiSecret = credentials?.apiSecret || env.MAILJET_API_SECRET || process.env.MAILJET_API_SECRET || '';
  }

  private getClient() {
    if (this.client) return this.client;

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Mailjet API keys are missing');
    }

    this.client = new Mailjet({
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
    });

    return this.client;
  }

  async send(options: EmailProviderOptions): Promise<SendResult> {
    try {
      const client = this.getClient();

      const eventPayload = options.metadata ? JSON.stringify(options.metadata) : undefined;

      const result = await client
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: {
                Email: options.fromEmail,
                Name: options.fromName,
              },
              To: [
                {
                  Email: options.toEmail,
                },
              ],
              Subject: options.subject,
              HTMLPart: options.html,
              TextPart: options.text || options.html.replace(/<[^>]*>?/gm, ''),
              CustomID: options.metadata?.jobId || options.metadata?.customId,
              EventPayload: eventPayload,
            },
          ],
        });

      const message = (result.body as any).Messages[0];

      return {
        success: message?.Status === 'success',
        messageId: message?.To?.[0]?.MessageID,
        provider: this.name,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown Mailjet error',
        provider: this.name,
      };
    }
  }
}
