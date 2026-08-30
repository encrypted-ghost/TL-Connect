import type { IEmailProvider, EmailProviderOptions, SendResult } from '../provider.interface';
import nodemailer from 'nodemailer';

export interface SmtpCredentials {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
}

export class SmtpEmailProvider implements IEmailProvider {
  name = 'smtp';
  private transporter: nodemailer.Transporter | null = null;
  private config: SmtpCredentials;

  constructor(credentials?: SmtpCredentials) {
    this.config = {
      host: credentials?.host || process.env.SMTP_HOST || process.env.SES_SMTP_HOST || '',
      port: Number(credentials?.port || process.env.SMTP_PORT || process.env.SES_SMTP_PORT || 587),
      secure: credentials?.secure ?? (Number(credentials?.port || process.env.SMTP_PORT) === 465),
      user: credentials?.user || process.env.SMTP_USER || process.env.SES_SMTP_USERNAME || '',
      pass: credentials?.pass || process.env.SMTP_PASS || process.env.SES_SMTP_PASSWORD || '',
    };
  }

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    if (!this.config.host || !this.config.user) {
      throw new Error('SMTP host and user credentials are required');
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
      tls: {
        rejectUnauthorized: false, // Helps with self-hosted / internal certificates
      },
    });

    return this.transporter;
  }

  async send(options: EmailProviderOptions): Promise<SendResult> {
    try {
      const transporter = this.getTransporter();

      const info = await transporter.sendMail({
        from: `"${options.fromName}" <${options.fromEmail}>`,
        to: options.toEmail,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
        headers: options.metadata
          ? {
              'X-Campaign-ID': String(options.metadata.campaignId || ''),
              'X-Lead-ID': String(options.metadata.leadId || ''),
              'X-Job-ID': String(options.metadata.jobId || ''),
            }
          : undefined,
      });

      return {
        success: !!info.messageId,
        messageId: info.messageId,
        provider: this.name,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown SMTP transport error',
        provider: this.name,
      };
    }
  }
}
