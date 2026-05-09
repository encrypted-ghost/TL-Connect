import { IEmailProvider, EmailProviderOptions, SendResult } from './provider.interface';
import { sendPulseProvider as spApi } from './sendpulse.provider';

export class SendPulseEmailProvider implements IEmailProvider {
  name = 'sendpulse';

  async send(options: EmailProviderOptions): Promise<SendResult> {
    try {
      const result = await spApi.sendEmail({
        fromEmail: options.fromEmail,
        fromName: options.fromName,
        toEmail: options.toEmail,
        subject: options.subject,
        html: options.html,
        tags: options.tags,
      });

      return {
        success: result.success,
        messageId: result.id,
        provider: this.name,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        provider: this.name,
      };
    }
  }
}

/**
 * Fallback provider for development when no keys are present
 */
export class MockEmailProvider implements IEmailProvider {
  name = 'mock';

  async send(options: EmailProviderOptions): Promise<SendResult> {
    console.log(`[MOCK EMAIL] To: ${options.toEmail} | Subject: ${options.subject}`);
    return {
      success: true,
      messageId: `mock_${Math.random().toString(36).substr(2, 9)}`,
      provider: this.name,
    };
  }
}
