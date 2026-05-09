import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Supabase (Primary Database Access)
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1, 'Supabase Secret Key is required'),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'Supabase Publishable Key is required'),
  
  // Auth (Internal JWT)
  JWT_SECRET: z.string().min(32),
  
  // AI
  GEMINI_API_KEY: z.string().optional(),
  
  // Email Providers
  MAILJET_API_KEY: z.string().optional(),
  MAILJET_API_SECRET: z.string().optional(),
  
  // Infrastructure
  
  // Notifications
  SLACK_WEBHOOK_URL: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables');
}

export const env = _env.data;
export type Env = z.infer<typeof envSchema>;
