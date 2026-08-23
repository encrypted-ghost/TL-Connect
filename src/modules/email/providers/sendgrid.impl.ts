import type { IEmailProvider, EmailProviderOptions, SendResult } from '../provider.interface.ts';
import axios from 'axios';

export interface SendGridCredentials {
  apiKey: string;
}

export class SendGridEmailProvider implements IEmailProvider {
  name = 'sendgrid';
  private apiKey: string;

  constructor(credentials?: SendGridCredentials) {
    this.apiKey = credentials?.apiKey || process.env.SENDGRID_API_KEY || '';
  }

  async send(options: EmailProviderOptions): Promise<SendResult> {
    try {
      if (!this.apiKey) {
        throw new Error('SendGrid API key is missing');
      }

      const payload: any = {
        personalizations: [
          {
            to: [{ email: options.toEmail }],
            subject: options.subject,
          },
        ],
        from: {
          email: options.fromEmail,
          name: options.fromName,
        },
        content: [
          {
            type: 'text/html',
            value: options.html,
          },
        ],
      };

      if (options.text) {
        payload.content.unshift({
          type: 'text/plain',
          value: options.text,
        });
      }

      if (options.metadata) {
        payload.custom_args = options.metadata;
      }

      const response = await axios.post('https://api.sendgrid.com/v3/mail/send', payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const messageId = response.headers['x-message-id'] || 'sendgrid-ok';

      return {
        success: true,
        messageId,
        provider: this.name,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.errors?.[0]?.message || error.message || 'Unknown SendGrid error';
      return {
        success: false,
        error: errorMsg,
        provider: this.name,
      };
    }
  }
}
