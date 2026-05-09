import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('[SupabaseAdmin] CRITICAL: SUPABASE credentials missing from environment.');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseKey,
  {
    db: { schema: 'connect' }
  }
);
