import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('[SupabaseAdmin] CRITICAL: SUPABASE credentials missing from environment.');
} else {
  const isServiceKey = !!process.env.SUPABASE_SECRET_KEY;
  console.log(`[SupabaseAdmin] Initializing with ${isServiceKey ? 'SERVICE_ROLE' : 'ANON'} key. URL: ${supabaseUrl.substring(0, 20)}...`);
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseKey,
  {
    db: {
      schema: 'connect'
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);
