import { config } from '@/src/config';
import { env } from '@/src/config/env.config';
import { IEmailProvider } from './provider.interface';
import { MockEmailProvider } from './providers/mock.impl';
import { MailjetEmailProvider } from './providers/mailjet.impl';

export class EmailProviderFactory {
  private static instance: IEmailProvider | null = null;

  static getProvider(): IEmailProvider {
    if (this.instance) return this.instance;

    const providerType = config.email.provider;

    if (providerType === 'mailjet' && env.MAILJET_API_KEY) {
      this.instance = new MailjetEmailProvider();
    } else {
      // Default to mock if keys missing
      this.instance = new MockEmailProvider();
    }

    return this.instance;
  }
}
