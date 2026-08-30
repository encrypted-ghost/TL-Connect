import { EmailProviderFactory } from './email.factory';

export const emailProvider = EmailProviderFactory.getProvider();
