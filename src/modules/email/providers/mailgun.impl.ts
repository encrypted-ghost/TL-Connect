import type { IEmailProvider, EmailProviderOptions, SendResult } from '../provider.interface.ts';
import axios from 'axios';

export interface MailgunCredentials {
  apiKey: string;
  domain: string;
  region?: 'us' | 'eu';
}

export class MailgunEmailProvider implements IEmailProvider {
  name = 'mailgun';
  private apiKey: string;
  private domain: string;
  private host: string;

  constructor(credentials?: MailgunCredentials) {
    this.apiKey = credentials?.apiKey || process.env.MAILGUN_API_KEY || '';
    this.domain = credentials?.domain || process.env.MAILGUN_DOMAIN || '';
    const region = credentials?.region || process.env.MAILGUN_REGION || 'us';
    this.host = region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';
  }

  async send(options: EmailProviderOptions): Promise<SendResult> {
    try {
      if (!this.apiKey || !this.domain) {
        throw new Error('Mailgun API key and domain are required');
      }

      const params = new URLSearchParams();
      params.append('from', `${options.fromName} <${options.fromEmail}>`);
      params.append('to', options.toEmail);
      params.append('subject', options.subject);
      params.append('html', options.html);
      if (options.text) {
        params.append('text', options.text);
      }

      if (options.tags && options.tags.length > 0) {
        options.tags.forEach((tag) => params.append('o:tag', tag));
      }

      if (options.metadata) {
        Object.entries(options.metadata).forEach(([k, v]) => {
          params.append(`v:${k}`, typeof v === 'string' ? v : JSON.stringify(v));
        });
      }

      const authHeader = `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`;

      const response = await axios.post(`${this.host}/v3/${this.domain}/messages`, params, {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      });

      return {
        success: true,
        messageId: response.data?.id,
        provider: this.name,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown Mailgun error';
      return {
        success: false,
        error: errorMsg,
        provider: this.name,
      };
    }
  }
}
