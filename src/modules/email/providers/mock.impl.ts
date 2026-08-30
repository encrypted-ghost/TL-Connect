import type { IEmailProvider, EmailProviderOptions, SendResult } from '../provider.interface';

export class MockEmailProvider implements IEmailProvider {
  name = 'mock';

  async send(options: EmailProviderOptions): Promise<SendResult> {
    console.log(`[MOCK EMAIL] Sent to ${options.toEmail} with subject: ${options.subject}`);
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      provider: this.name,
    };
  }
}
