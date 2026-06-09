import { createClient } from '@supabase/supabase-js';

// Browser client. Uses the public anon key; Row Level Security + profiles.is_admin
// govern access. Session persists in localStorage.
// Fallbacks keep `next build` from throwing during prerender when env isn't set;
// real NEXT_PUBLIC_ values are inlined at build time / read at dev runtime.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(url, anonKey);
