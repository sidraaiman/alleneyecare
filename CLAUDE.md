# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Backend Setup (one-time)

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor (creates all tables, RLS, trigger, seeds products)
3. In the Supabase dashboard → Database → Replication, enable Realtime for `orders` and `products`
4. In Auth → Providers, enable **Phone** (requires a Twilio account for SMS OTP)
5. Copy your project URL and anon key into `.env` (see `.env.example`):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
6. **AI assistant.** Runs fully on-device by default (no key, no backend, no rate
   limits). To optionally use a cloud LLM (Google Gemini, free tier), set
   `EXPO_PUBLIC_USE_CLOUD_AI=true` and deploy the Edge Function with the key
   server-side (never behind `EXPO_PUBLIC_`):
   ```
   supabase functions deploy ai-chat
   supabase secrets set GEMINI_API_KEY=AIza...   # key from https://aistudio.google.com/app/apikey
   ```
   Cloud errors / rate limits auto-fall back to the local engine.

## Commands

```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run in browser
```

There is no lint, test, or build script configured. TypeScript checking: `npx tsc --noEmit`.

## Architecture

**Expo Router (file-based routing)** — screens live under `app/`. Routes map directly to file paths.

- `app/_layout.tsx` — Root layout: fonts, `AuthProvider` → `CartProvider` → `ProductsProvider` → `AIProvider` → (`CartSyncManager` + `RootNavigator`). `RootNavigator` handles auth redirect (unauthenticated → `/(auth)/phone`).
- `app/(auth)/` — Phone OTP sign-in screens (`phone.tsx` → `verify.tsx`)
- `app/(tabs)/` — Bottom tab navigator with 4 tabs: Home, Products, Cart, Account
- `app/product/[id].tsx` — Dynamic product detail route

**Supabase client** — `lib/supabase.ts` exports the typed client (uses `lib/database.types.ts`). Always import from `@/lib/supabase`; do not instantiate a new client elsewhere.

**Auth** — `context/AuthContext.tsx` wraps Supabase Phone OTP. `useAuth()` exposes `user`, `signInWithPhone`, `verifyOTP`, `signOut`.

**State management** — `context/CartContext.tsx` uses Context API + `useReducer`. Includes `SET_CART` action for bulk hydration. `CartSyncManager` (in root layout) loads the cart from Supabase on login, debounce-syncs changes back, and clears on logout.

**Product data** — `context/ProductsContext.tsx` (`ProductsProvider`) does a single Supabase fetch + one realtime subscription for the whole app; `useProducts()` (re-exported via `hooks/useProducts.ts`) reads from it. Falls back to `data/products.ts` if Supabase has no data yet (before seeding).

**AI assistant** — `context/AIContext.tsx` drives the chat. By default it uses a local rule-based engine (`services/assistant.ts`) — no network, no key, no rate limits. If `EXPO_PUBLIC_USE_CLOUD_AI=true`, it instead calls the `ai-chat` Supabase Edge Function (`supabase/functions/ai-chat`, Google Gemini) via `services/ai.ts`, sending the user's session token (key stays server-side), and falls back to the local engine on any error.

**Orders** — `hooks/useOrders.ts` fetches user orders and subscribes to realtime status changes. Status updates trigger a local push notification via `services/notifications.ts`.

**Design system** — Colors in `constants/Colors.ts` (Navy `#0D1B2A`, Gold `#C9A84C`, Cream `#FAF8F5`). Typography uses Cormorant Garamond for headings, DM Sans for body/UI.

## Key Conventions

- Path alias `@/*` resolves to the repo root (configured in `tsconfig.json`). Use `@/context/CartContext` not relative paths.
- Icons use `@expo/vector-icons` (Ionicons).
- Animations use `react-native-reanimated` (v4). Do not mix with the built-in `Animated` API.
- All screens use `SafeAreaView` / `useSafeAreaInsets` for inset handling.
- `AsyncStorage` is installed but unused — cart persistence is not yet implemented.
