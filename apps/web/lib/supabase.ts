import { createClient } from '@supabase/supabase-js';

// Retrieve Supabase environment variables with safe fallbacks for compilation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key-ensure-to-replace-in-env';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase environment variables are missing! Using fallback placeholder credentials. Please specify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local.'
  );
}

/**
 * Production-ready Supabase Client.
 * Automatically handles local storage persistence, token auto-refresh, and initial session detection in URL.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'omnichat_session',
  },
});
