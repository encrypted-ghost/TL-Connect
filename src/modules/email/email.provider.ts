import { EmailProviderFactory } from './email.factory.ts';

export const emailProvider = EmailProviderFactory.getProvider();
