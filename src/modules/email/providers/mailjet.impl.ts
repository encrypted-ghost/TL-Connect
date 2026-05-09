import { IEmailProvider, EmailProviderOptions, SendResult } from '../provider.interface';
import Mailjet from 'node-mailjet';
import { env } from '@/src/config/env.config';

export class MailjetEmailProvider implements IEmailProvider {
  name = 'mailjet';
  private client: Mailjet | null = null;

  private getClient() {
    if (this.client) return this.client;
    
    if (!env.MAILJET_API_KEY || !env.MAILJET_API_SECRET) {
      throw new Error('Mailjet API keys are missing');
    }

    this.client = new Mailjet({
      apiKey: env.MAILJET_API_KEY,
      apiSecret: env.MAILJET_API_SECRET
    });
    
    return this.client;
  }

  async send(options: EmailProviderOptions): Promise<SendResult> {
    try {
      const client = this.getClient();
      
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
              CustomID: options.metadata?.customId,
            },
          ],
        });

      const message = (result.body as any).Messages[0];
      
      return {
        success: message.Status === 'success',
        messageId: message.To[0]?.MessageID,
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
