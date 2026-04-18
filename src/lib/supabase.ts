import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

function isPlaceholderValue(value: string | undefined) {
  if (!value) return true;

  const normalized = value.trim().toLowerCase();

  return (
    normalized.length === 0 ||
    normalized.includes('your-supabase-url') ||
    normalized.includes('your-anon-key') ||
    normalized.includes('placeholder')
  );
}

export const isSupabaseConfigured =
  !isPlaceholderValue(import.meta.env.VITE_SUPABASE_URL) &&
  !isPlaceholderValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
}
