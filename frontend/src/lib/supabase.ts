import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env — auth will not work. ' +
      'Create frontend/.env with both values (copy from frontend/.env.example).',
  );
}

if (import.meta.env.DEV) {
  console.info(
    '[supabase] connected project: ' + supabaseUrl,
    '| key type: ' + (supabaseAnonKey.startsWith('sb_publishable_') ? 'publishable' : 'legacy anon'),
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = true;
