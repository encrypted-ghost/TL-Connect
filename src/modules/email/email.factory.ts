import { config } from '@/src/config';
import { env } from '@/src/config/env.config';
import { IEmailProvider } from './provider.interface';
import { SendPulseEmailProvider, MockEmailProvider } from './providers/sendpulse.impl';

export class EmailProviderFactory {
  private static instance: IEmailProvider | null = null;

  static getProvider(): IEmailProvider {
    if (this.instance) return this.instance;

    const providerType = config.email.provider;

    if (providerType === 'sendpulse' && env.SENDPULSE_API_ID) {
      this.instance = new SendPulseEmailProvider();
    } else {
      // Default to mock if keys missing or explicitly set
      this.instance = new MockEmailProvider();
    }

    return this.instance;
  }
}
