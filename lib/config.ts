// Demo mode: active when EXPO_PUBLIC_SUPABASE_URL is not set or still has the placeholder value.
// In demo mode: auth is bypassed, products use local data, cart is local-only, orders are mocked.
export const IS_DEMO =
  !process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project-ref');
