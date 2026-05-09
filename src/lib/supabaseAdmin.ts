import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error('[SupabaseAdmin] CRITICAL: SUPABASE_URL or SUPABASE_SECRET_KEY is missing from environment.');
}

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SECRET_KEY || '',
  {
    db: { schema: 'connect' }
  }
);
