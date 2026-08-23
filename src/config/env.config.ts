import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Supabase (Primary Database Access)
  SUPABASE_URL: z.string().url().default('https://placeholder.supabase.co'),
  SUPABASE_SECRET_KEY: z.string().default('placeholder-secret-key'),
  SUPABASE_PUBLISHABLE_KEY: z.string().default('placeholder-publishable-key'),
  
  // Auth (Internal JWT)
  JWT_SECRET: z.string().min(16).default('development-jwt-secret-placeholder-key-32-chars!'),
  
  // AI
  GEMINI_API_KEY: z.string().optional(),
  
  // Email Providers (Optional ENV Fallbacks)
  BREVO_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  POSTMARK_SERVER_TOKEN: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MAILJET_API_KEY: z.string().optional(),
  MAILJET_API_SECRET: z.string().optional(),
  
  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  
  // Notifications
  SLACK_WEBHOOK_URL: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.warn('⚠️ Environment variables warning:', _env.error.format());
}

export const env = _env.success ? _env.data : (envSchema.parse({}) as any);
export type Env = z.infer<typeof envSchema>;
