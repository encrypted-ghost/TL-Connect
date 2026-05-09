import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.config';

/**
 * Production Supabase Client
 * We use this for ALL database operations to avoid IPv4 connection string issues.
 * This client uses the SECRET KEY (Service Role) to act as the backend administrator.
 */
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper for type-safe database access (can be expanded with generated types)
export const db = supabase;
