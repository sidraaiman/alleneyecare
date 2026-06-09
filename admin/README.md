# AllenEyeCare Admin

Small Next.js dashboard for staff to manage orders and products. It talks to the
same Supabase project as the mobile app using the **public anon key** — access is
controlled by Row Level Security and the `profiles.is_admin` flag (no service-role
key in the browser).

## Setup

```bash
cd admin
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL + ANON_KEY
npm run dev                         # http://localhost:3001
```

## Create an admin user (one-time)

1. Supabase dashboard → **Authentication → Users → Add user** (email + password).
2. Supabase → **Table editor → profiles** → set `is_admin = true` for that user's row.
   (If the profile row doesn't exist yet, sign in once via the app/dashboard so the
   `handle_new_user` trigger creates it, or insert it manually.)

## What it does

- **Orders** — list every order; change status via the dropdown. The mobile app
  receives the change over Supabase Realtime and shows an order-status notification.
- **Products** — edit price/stock inline, upload a product image to the
  `product-images` Storage bucket, and add new products.

Requires the schema in `../supabase/schema.sql` to be applied (admin RLS policies,
`is_admin()` helper, and the `product-images` bucket).
