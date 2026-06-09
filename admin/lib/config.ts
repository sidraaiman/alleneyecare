// Demo mode: active when no real Supabase project is configured (placeholder URL).
// In demo mode the dashboard accepts a temporary login and shows mock data, so it
// can be explored without a backend — mirroring the mobile app's demo mode.
export const IS_DEMO =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref');

// Temporary credentials used ONLY in demo mode.
export const DEMO_EMAIL = 'admin@demo.local';
export const DEMO_PASSWORD = 'admin123';
