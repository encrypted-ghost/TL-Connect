import axios from 'axios';
import { emailProvider } from '../email/email.provider';

/**
 * SendPulse API Provider Implementation
 */
export class SendPulseProvider {
  private apiId: string;
  private apiSecret: string;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.apiId = process.env.SENDPULSE_API_ID || '';
    this.apiSecret = process.env.SENDPULSE_API_SECRET || '';
  }

  private async getAccessToken() {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post('https://api.sendpulse.com/oauth/access_token', {
        grant_type: 'client_credentials',
        client_id: this.apiId,
        client_secret: this.apiSecret,
      });

      this.token = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
      return this.token;
    } catch (error) {
      console.error('SendPulse Auth Error:', error);
      throw new Error('Failed to authenticate with SendPulse');
    }
  }

  async sendEmail(options: {
    fromEmail: string;
    fromName: string;
    toEmail: string;
    subject: string;
    html: string;
    tags?: string[];
  }) {
    if (!this.apiId) {
      console.warn('SendPulse credentials missing. Email not sent.');
      return { success: false, mock: true };
    }

    const token = await this.getAccessToken();

    try {
      const response = await axios.post(
        'https://api.sendpulse.com/smtp/emails',
        {
          email: {
            html: options.html,
            subject: options.subject,
            from: {
              name: options.fromName,
              email: options.fromEmail,
            },
            to: [
              {
                email: options.toEmail,
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return { success: true, id: response.data.id };
    } catch (error) {
      console.error('SendPulse Send Error:', error);
      throw error;
    }
  }
}

export const sendPulseProvider = new SendPulseProvider();
