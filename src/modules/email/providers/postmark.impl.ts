import type { IEmailProvider, EmailProviderOptions, SendResult } from '../provider.interface';
import axios from 'axios';

export interface PostmarkCredentials {
  serverToken: string;
}

export class PostmarkEmailProvider implements IEmailProvider {
  name = 'postmark';
  private serverToken: string;

  constructor(credentials?: PostmarkCredentials) {
    this.serverToken = credentials?.serverToken || process.env.POSTMARK_SERVER_TOKEN || '';
  }

  async send(options: EmailProviderOptions): Promise<SendResult> {
    try {
      if (!this.serverToken) {
        throw new Error('Postmark Server Token is missing');
      }

      const payload: any = {
        From: `${options.fromName} <${options.fromEmail}>`,
        To: options.toEmail,
        Subject: options.subject,
        HtmlBody: options.html,
        TextBody: options.text || options.html.replace(/<[^>]*>?/gm, ''),
        MessageStream: 'outbound',
      };

      if (options.tags && options.tags.length > 0) {
        payload.Tag = options.tags[0];
      }

      if (options.metadata) {
        payload.Metadata = options.metadata;
      }

      const response = await axios.post('https://api.postmarkapp.com/email', payload, {
        headers: {
          'X-Postmark-Server-Token': this.serverToken,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      });

      return {
        success: response.data?.ErrorCode === 0,
        messageId: response.data?.MessageID,
        provider: this.name,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.Message || error.message || 'Unknown Postmark error';
      return {
        success: false,
        error: errorMsg,
        provider: this.name,
      };
    }
  }
}
