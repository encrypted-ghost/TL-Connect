import type { IEmailProvider, EmailProviderOptions, SendResult } from '../provider.interface.ts';
import axios from 'axios';
import { env } from '../../../config/env.config.ts';

export interface ResendCredentials {
  apiKey: string;
}

export class ResendEmailProvider implements IEmailProvider {
  name = 'resend';
  private apiKey: string;

  constructor(credentials?: ResendCredentials) {
    this.apiKey = credentials?.apiKey || (process.env.RESEND_API_KEY || (env as any).RESEND_API_KEY || '');
  }

  async send(options: EmailProviderOptions): Promise<SendResult> {
    try {
      if (!this.apiKey) {
        throw new Error('Resend API key is missing');
      }

      const payload: any = {
        from: `${options.fromName} <${options.fromEmail}>`,
        to: [options.toEmail],
        subject: options.subject,
        html: options.html,
      };

      if (options.text) {
        payload.text = options.text;
      }

      if (options.tags && options.tags.length > 0) {
        payload.tags = options.tags.map((tag) => ({ name: tag, value: tag }));
      }

      const response = await axios.post('https://api.resend.com/emails', payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      return {
        success: true,
        messageId: response.data?.id,
        provider: this.name,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown Resend error';
      return {
        success: false,
        error: errorMsg,
        provider: this.name,
      };
    }
  }
}
