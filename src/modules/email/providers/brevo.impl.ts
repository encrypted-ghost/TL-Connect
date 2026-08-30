import type { IEmailProvider, EmailProviderOptions, SendResult } from '../provider.interface';
import axios from 'axios';
import { env } from '../../../config/env.config';

export interface BrevoCredentials {
  apiKey: string;
}

export class BrevoEmailProvider implements IEmailProvider {
  name = 'brevo';
  private apiKey: string;

  constructor(credentials?: BrevoCredentials) {
    this.apiKey = credentials?.apiKey || (process.env.BREVO_API_KEY || (env as any).BREVO_API_KEY || '');
  }

  async send(options: EmailProviderOptions): Promise<SendResult> {
    try {
      if (!this.apiKey) {
        throw new Error('Brevo API key is missing');
      }

      const payload: any = {
        sender: {
          name: options.fromName,
          email: options.fromEmail,
        },
        to: [
          {
            email: options.toEmail,
          },
        ],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text || options.html.replace(/<[^>]*>?/gm, ''),
      };

      if (options.tags && options.tags.length > 0) {
        payload.tags = options.tags;
      }

      if (options.metadata) {
        payload.params = options.metadata;
      }

      const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      });

      return {
        success: true,
        messageId: response.data?.messageId,
        provider: this.name,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown Brevo error';
      return {
        success: false,
        error: errorMsg,
        provider: this.name,
      };
    }
  }
}
