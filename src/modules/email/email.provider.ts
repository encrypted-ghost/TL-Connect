import FormData from 'form-data';
import Mailgun from 'mailgun.js';

export interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export class EmailProvider {
  private mg;
  private domain: string;

  constructor() {
    const apiKey = process.env.MAILGUN_API_KEY || '';
    const domain = process.env.MAILGUN_DOMAIN || '';
    
    const mailgun = new Mailgun(FormData);
    this.mg = mailgun.client({ username: 'api', key: apiKey });
    this.domain = domain;
  }

  async send(options: EmailOptions) {
    if (!process.env.MAILGUN_API_KEY) {
      console.warn('Mailgun API key missing. Email not sent:', options.subject);
      return { id: 'mock-id' };
    }

    try {
      const result = await this.mg.messages.create(this.domain, {
        from: options.from,
        to: [options.to],
        subject: options.subject,
        text: options.text,
        html: options.html,
        'o:tag': options.tags,
        'v:metadata': JSON.stringify(options.metadata || {}),
      });
      return result;
    } catch (error) {
      console.error('Mailgun Send Error:', error);
      throw error;
    }
  }
}

export const emailProvider = new EmailProvider();
