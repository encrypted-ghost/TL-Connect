import { config } from '../../config/index.ts';
import { env } from '../../config/env.config.ts';
import type { IEmailProvider } from './provider.interface.ts';
import { MockEmailProvider } from './providers/mock.impl.ts';
import { MailjetEmailProvider } from './providers/mailjet.impl.ts';

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
