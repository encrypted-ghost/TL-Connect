import type { IEmailProvider } from './provider.interface.ts';
import { MockEmailProvider } from './providers/mock.impl.ts';
import { MailjetEmailProvider } from './providers/mailjet.impl.ts';
import { BrevoEmailProvider } from './providers/brevo.impl.ts';
import { ResendEmailProvider } from './providers/resend.impl.ts';
import { SendGridEmailProvider } from './providers/sendgrid.impl.ts';
import { PostmarkEmailProvider } from './providers/postmark.impl.ts';
import { MailgunEmailProvider } from './providers/mailgun.impl.ts';
import { SmtpEmailProvider } from './providers/smtp.impl.ts';
import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';

export interface WorkspaceEmailConfig {
  provider: IEmailProvider;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  dailyLimit: number;
  providerType: string;
  providerId?: string;
}

export class EmailProviderFactory {
  /**
   * Instantiate an email provider by type with explicit credentials
   */
  static createProvider(type: string, credentials: any = {}): IEmailProvider {
    switch (type.toLowerCase()) {
      case 'brevo':
        return new BrevoEmailProvider(credentials);
      case 'resend':
        return new ResendEmailProvider(credentials);
      case 'sendgrid':
        return new SendGridEmailProvider(credentials);
      case 'postmark':
        return new PostmarkEmailProvider(credentials);
      case 'mailgun':
        return new MailgunEmailProvider(credentials);
      case 'mailjet':
        return new MailjetEmailProvider(credentials);
      case 'smtp':
      case 'ses':
      case 'stalwart':
        return new SmtpEmailProvider(credentials);
      default:
        return new MockEmailProvider();
    }
  }

  /**
   * Fetch active provider configuration for a workspace from the Database
   */
  static async getProviderForWorkspace(workspaceId: string): Promise<WorkspaceEmailConfig> {
    try {
      if (workspaceId) {
        const { data: providers, error } = await supabaseAdmin
          .from('email_providers')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && providers && providers.length > 0) {
          const config = providers[0];
          const providerInstance = this.createProvider(config.provider_type, config.credentials);

          return {
            provider: providerInstance,
            fromEmail: config.from_email || process.env.SENDER_EMAIL || 'outreach@transferlegacy.com',
            fromName: config.from_name || process.env.SENDER_NAME || 'Transfer Legacy',
            replyTo: config.reply_to,
            dailyLimit: config.daily_limit || 1000,
            providerType: config.provider_type,
            providerId: config.id,
          };
        }
      }
    } catch (err) {
      console.warn('[EmailProviderFactory] Failed to load DB provider, falling back to ENV/Mock:', err);
    }

    // Fallback: Environment Variables / Mock
    return this.getFallbackConfig();
  }

  /**
   * Fallback configuration from environment variables
   */
  private static getFallbackConfig(): WorkspaceEmailConfig {
    if (process.env.BREVO_API_KEY) {
      return {
        provider: new BrevoEmailProvider(),
        fromEmail: process.env.SENDER_EMAIL || 'outreach@transferlegacy.com',
        fromName: process.env.SENDER_NAME || 'Transfer Legacy',
        dailyLimit: 1000,
        providerType: 'brevo',
      };
    }

    if (process.env.RESEND_API_KEY) {
      return {
        provider: new ResendEmailProvider(),
        fromEmail: process.env.SENDER_EMAIL || 'outreach@transferlegacy.com',
        fromName: process.env.SENDER_NAME || 'Transfer Legacy',
        dailyLimit: 1000,
        providerType: 'resend',
      };
    }

    if (process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET) {
      return {
        provider: new MailjetEmailProvider(),
        fromEmail: process.env.SENDER_EMAIL || 'outreach@transferlegacy.com',
        fromName: process.env.SENDER_NAME || 'Transfer Legacy',
        dailyLimit: 1000,
        providerType: 'mailjet',
      };
    }

    if (process.env.SES_SMTP_HOST && process.env.SES_SMTP_USERNAME) {
      return {
        provider: new SmtpEmailProvider(),
        fromEmail: process.env.SENDER_EMAIL || 'outreach@transferlegacy.com',
        fromName: process.env.SENDER_NAME || 'Transfer Legacy',
        dailyLimit: 1000,
        providerType: 'smtp',
      };
    }

    return {
      provider: new MockEmailProvider(),
      fromEmail: process.env.SENDER_EMAIL || 'outreach@transferlegacy.com',
      fromName: process.env.SENDER_NAME || 'Transfer Legacy',
      dailyLimit: 1000,
      providerType: 'mock',
    };
  }

  /**
   * Backwards compatible legacy method
   */
  static getProvider(): IEmailProvider {
    return this.getFallbackConfig().provider;
  }
}
