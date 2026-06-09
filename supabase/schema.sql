-- ============================================================
-- AllenEyeCare – Supabase Schema
-- Run this in the Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────
create table public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  phone        text,
  full_name    text,
  points       integer not null default 0,
  push_token   text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone) values (new.id, new.phone);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Admin role helper (used by RLS policies + the web dashboard)
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

-- Trigram search support (used by search_products / product_suggestions)
create extension if not exists pg_trgm;

-- ── Products ────────────────────────────────────────────────
create table public.products (
  id             text primary key,
  name           text not null,
  brand          text not null,
  category       text not null,
  price          integer not null,
  original_price integer,
  rating         numeric(3,1) not null default 0,
  reviews        integer not null default 0,
  image          text not null default '',
  images         text[] not null default '{}',
  frame_shape    text not null default '',
  material       text not null default '',
  color          text not null default '',
  colors         text[] not null default '{}',
  gender         text not null default 'unisex',
  is_new         boolean not null default false,
  is_best_seller boolean not null default false,
  is_premium     boolean not null default false,
  has_try_on     boolean not null default false,
  specs          jsonb not null default '{}',
  description    text not null default '',
  tags           text[] not null default '{}',
  stock_count    integer not null default 100,
  frame_size     text,
  face_shapes    text[] not null default '{}',
  created_at     timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "Anyone can read products" on public.products for select using (true);
create policy "Admins manage products" on public.products for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Search indexes
create index if not exists products_name_trgm  on public.products using gin (name gin_trgm_ops);
create index if not exists products_brand_trgm on public.products using gin (brand gin_trgm_ops);
create index if not exists products_tags_gin   on public.products using gin (tags);
create index if not exists products_face_gin   on public.products using gin (face_shapes);

-- ── Search & recommendations ─────────────────────────────────
-- Server-side search so the client never has to hold/scan the whole catalog.
create or replace function public.search_products(
  q text default null,
  p_category text default null,
  p_shape text default null,
  p_gender text default null,
  p_min int default null,
  p_max int default null,
  p_sort text default 'relevance',
  p_limit int default 40,
  p_offset int default 0
) returns setof public.products
language sql stable as $$
  select p.*
  from public.products p
  where (q is null or q = ''
         or p.name ilike '%' || q || '%'
         or p.brand ilike '%' || q || '%'
         or exists (select 1 from unnest(p.tags) t where t ilike '%' || q || '%'))
    and (p_category is null or p_category = 'all' or p.category = p_category)
    and (p_shape    is null or p_shape    = 'all' or p.frame_shape = p_shape)
    and (p_gender   is null or p_gender   = 'all' or p.gender = p_gender)
    and (p_min is null or p.price >= p_min)
    and (p_max is null or p.price <= p_max)
  order by
    case when p_sort = 'price_asc'  then p.price end asc nulls last,
    case when p_sort = 'price_desc' then p.price end desc nulls last,
    case when p_sort = 'rating'     then p.rating end desc nulls last,
    case when p_sort = 'newest'     then (case when p.is_new then 1 else 0 end) end desc nulls last,
    case when q is not null and q <> '' and p.name ilike q || '%' then 0 else 1 end,
    case when p.is_best_seller then 0 else 1 end,
    p.created_at asc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;

create or replace function public.product_suggestions(q text, p_limit int default 6)
returns table(label text) language sql stable as $$
  select label from (
    select distinct name  as label from public.products where q is not null and q <> '' and name  ilike '%' || q || '%'
    union
    select distinct brand as label from public.products where q is not null and q <> '' and brand ilike '%' || q || '%'
  ) s
  order by label
  limit greatest(p_limit, 1);
$$;

create or replace function public.recommended_products(p_product_id text, p_limit int default 4)
returns setof public.products language sql stable as $$
  with base as (select * from public.products where id = p_product_id)
  select p.*
  from public.products p, base b
  where p.id <> b.id
  order by
    case when p.category = b.category then 0 else 1 end,
    case when p.face_shapes && b.face_shapes then 0 else 1 end,
    abs(p.price - b.price)
  limit greatest(p_limit, 1);
$$;

grant execute on function public.search_products(text,text,text,text,int,int,text,int,int) to anon, authenticated;
grant execute on function public.product_suggestions(text,int) to anon, authenticated;
grant execute on function public.recommended_products(text,int) to anon, authenticated;

-- ── Events (product views etc. — powers recently-viewed + recs) ──
create table public.events (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade,
  type       text not null,
  product_id text,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "Users insert own events" on public.events for insert with check (auth.uid() = user_id);
create policy "Users read own events"   on public.events for select using (auth.uid() = user_id);
create policy "Admins read all events"  on public.events for select using (public.is_admin(auth.uid()));
create index if not exists events_user_created on public.events (user_id, created_at desc);

-- Decrement stock (called after order placement)
create or replace function public.decrement_stock(p_id text, qty integer)
returns void language sql security definer as $$
  update public.products
  set stock_count = greatest(0, stock_count - qty)
  where id = p_id;
$$;

-- ── Lens Options (server-authoritative lens pricing) ─────────
create table public.lens_options (
  type        text primary key,
  label       text not null,
  price       integer not null default 0,
  vision_type text not null default 'single-vision',
  tier        text not null default 'Standard',
  description text not null default ''
);
alter table public.lens_options enable row level security;
create policy "Anyone can read lens options" on public.lens_options for select using (true);
create policy "Admins manage lens options" on public.lens_options for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
insert into public.lens_options (type, label, price, vision_type, tier, description) values
  ('non-powered',         'Plano (No Power)',  0,    'non-powered',   'Standard', 'Zero-power lenses for sunglasses or fashion frames.'),
  ('non-powered-blu',     'Blue-Cut Plano',    299,  'non-powered',   'Blue-cut', 'Zero power with a blue-light filter.'),
  ('single-vision',       'Standard',          399,  'single-vision', 'Standard', 'Anti-reflective single-vision lenses.'),
  ('single-vision-blu',   'Blue-Cut',          799,  'single-vision', 'Blue-cut', 'AR + blue-light filter for screen use.'),
  ('single-vision-thin',  'Thin (High-Index)', 1299, 'single-vision', 'Thin',     'Lightweight high-index, AR + blue-light.'),
  ('bifocal',             'Standard',          699,  'bifocal',       'Standard', 'Bifocal lenses with anti-reflective coating.'),
  ('bifocal-blu',         'Blue-Cut',          1099, 'bifocal',       'Blue-cut', 'Bifocal with AR + blue-light filter.'),
  ('progressive',         'Standard',          999,  'progressive',   'Standard', 'No-line progressive with AR coating.'),
  ('progressive-premium', 'Premium',           1999, 'progressive',   'Premium',  'Wide-field premium progressive, AR + blue-light.');

-- ── Cart Items ───────────────────────────────────────────────
create table public.cart_items (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users on delete cascade not null,
  product_id   text references public.products not null,
  quantity     integer not null default 1,
  lens_type    text not null default 'non-powered',
  has_power    boolean not null default false,
  prescription text,
  created_at   timestamptz not null default now(),
  -- A frame can be in the cart once per lens type (single-vision vs progressive, etc.)
  unique (user_id, product_id, lens_type)
);
alter table public.cart_items enable row level security;
create policy "Users manage own cart" on public.cart_items for all using (auth.uid() = user_id);

-- MIGRATION (only if you created cart_items before the lens_type was added to the
-- unique constraint). Run once:
--   alter table public.cart_items drop constraint cart_items_user_id_product_id_key;
--   alter table public.cart_items add constraint cart_items_user_product_lens_key
--     unique (user_id, product_id, lens_type);

-- ── Wishlists ────────────────────────────────────────────────
create table public.wishlists (
  user_id    uuid references auth.users on delete cascade,
  product_id text references public.products,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.wishlists enable row level security;
create policy "Users manage own wishlist" on public.wishlists for all using (auth.uid() = user_id);

-- ── Prescriptions ────────────────────────────────────────────
create table public.prescriptions (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  name       text not null,
  r_sph numeric, r_cyl numeric, r_axis integer, r_add numeric,
  l_sph numeric, l_cyl numeric, l_axis integer, l_add numeric,
  pd         numeric,
  image_url  text,
  created_at timestamptz not null default now()
);
alter table public.prescriptions enable row level security;
create policy "Users manage own prescriptions" on public.prescriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Orders ───────────────────────────────────────────────────
create table public.orders (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users on delete cascade not null,
  status         text not null default 'confirmed',
  total          integer not null,
  address        jsonb,
  payment_method text,
  payment_id     text,
  payment_status text not null default 'pending',  -- pending | paid | failed | cod
  discount       integer not null default 0,
  coupon         text,
  points_earned   integer not null default 0,
  points_redeemed integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "Users read own orders"   on public.orders for select using (auth.uid() = user_id);
create policy "Users insert own orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "Admins read all orders"  on public.orders for select using (public.is_admin(auth.uid()));
create policy "Admins update orders"     on public.orders for update using (public.is_admin(auth.uid()));

-- ── Order Items ──────────────────────────────────────────────
create table public.order_items (
  id            uuid default gen_random_uuid() primary key,
  order_id      uuid references public.orders on delete cascade not null,
  product_id    text references public.products,
  product_name  text not null,
  product_image text,
  quantity      integer not null,
  lens_type     text,
  price         integer not null
);
alter table public.order_items enable row level security;
create policy "Users read own order items" on public.order_items for select
  using (exists (select 1 from public.orders where orders.id = order_id and orders.user_id = auth.uid()));
create policy "Users insert own order items" on public.order_items for insert
  with check (exists (select 1 from public.orders where orders.id = order_id and orders.user_id = auth.uid()));
create policy "Admins read all order items" on public.order_items for select
  using (public.is_admin(auth.uid()));

-- ── Memberships (Gold) ───────────────────────────────────────
create table public.memberships (
  user_id    uuid references auth.users on delete cascade primary key,
  tier       text not null default 'gold',
  active     boolean not null default true,
  started_at timestamptz not null default now(),
  expires_at timestamptz
);
alter table public.memberships enable row level security;
create policy "Users manage own membership" on public.memberships for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins read memberships" on public.memberships for select using (public.is_admin(auth.uid()));

create or replace function public.is_member(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = uid and m.active and (m.expires_at is null or m.expires_at > now())
  );
$$;

-- ── Coupons ──────────────────────────────────────────────────
create table public.coupons (
  code         text primary key,
  type         text not null default 'percent',   -- 'percent' | 'flat'
  value        integer not null,
  min_subtotal integer not null default 0,
  active       boolean not null default true,
  expires_at   timestamptz
);
alter table public.coupons enable row level security;
create policy "Admins manage coupons" on public.coupons for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
insert into public.coupons (code, type, value, min_subtotal) values
  ('WELCOME10', 'percent', 10,  999),
  ('FLAT200',   'flat',    200, 1999);

-- Validation runs server-side (definer) so coupon rules can't be forged.
create or replace function public.validate_coupon(p_code text, p_subtotal integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.coupons; d integer;
begin
  select * into c from public.coupons
    where code = upper(p_code) and active and (expires_at is null or expires_at > now());
  if not found then return jsonb_build_object('valid', false, 'discount', 0, 'message', 'Invalid or expired code'); end if;
  if p_subtotal < c.min_subtotal then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'Minimum order ₹' || c.min_subtotal);
  end if;
  if c.type = 'percent' then d := (p_subtotal * c.value) / 100; else d := c.value; end if;
  d := least(d, p_subtotal);
  return jsonb_build_object('valid', true, 'discount', d, 'message', 'Coupon applied');
end;
$$;

-- ── Reviews ──────────────────────────────────────────────────
create table public.reviews (
  id         uuid default gen_random_uuid() primary key,
  product_id text references public.products not null,
  user_id    uuid references auth.users on delete cascade not null,
  rating     integer not null check (rating between 1 and 5),
  title      text,
  body       text,
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
alter table public.reviews enable row level security;
create policy "Anyone reads reviews" on public.reviews for select using (true);
create policy "Users manage own reviews" on public.reviews for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Stamp verified_purchase from the user's order history on insert.
create or replace function public.set_review_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.verified_purchase := exists (
    select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
    where o.user_id = new.user_id and oi.product_id = new.product_id
  );
  return new;
end;
$$;
create trigger reviews_set_verified before insert on public.reviews
  for each row execute procedure public.set_review_verified();

-- ── Return Requests ──────────────────────────────────────────
create table public.return_requests (
  id         uuid default gen_random_uuid() primary key,
  order_id   uuid references public.orders on delete cascade not null,
  user_id    uuid references auth.users on delete cascade not null,
  reason     text,
  status     text not null default 'requested',  -- requested | approved | rejected | completed
  created_at timestamptz not null default now()
);
alter table public.return_requests enable row level security;
create policy "Users manage own returns" on public.return_requests for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins read all returns" on public.return_requests for select using (public.is_admin(auth.uid()));
create policy "Admins update returns"   on public.return_requests for update using (public.is_admin(auth.uid()));

-- ── Server-authoritative order pricing & placement ───────────
-- Totals are computed from products + lens_options on the server so the client
-- can never forge prices. Member (Gold) gets 5% off + free shipping; coupons are
-- validated server-side. place_order locks rows, commits, decrements stock atomically.

create or replace function public.compute_order_amount(p_items jsonb, p_coupon text default null, p_redeem_points integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item        jsonb;
  v_pid       text;
  v_lens      text;
  v_qty       integer;
  v_price     integer;
  v_lensprice integer;
  v_name      text;
  v_image     text;
  v_stock     integer;
  v_unit      integer;
  v_subtotal  integer := 0;
  v_lines     jsonb := '[]'::jsonb;
  v_member    boolean;
  v_memberd   integer := 0;
  v_coupon    jsonb;
  v_coupond   integer := 0;
  v_couponmsg text := null;
  v_discount  integer;
  v_shipping  integer;
  v_total     integer;
  v_pts_bal   integer := 0;
  v_pts_redeem integer := 0;
  v_pts_earn  integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'No items provided';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    v_pid  := item->>'product_id';
    v_lens := coalesce(item->>'lens_type', 'non-powered');
    v_qty  := coalesce((item->>'quantity')::int, 0);
    if v_qty < 1 then raise exception 'Invalid quantity for product %', v_pid; end if;

    select price, name, image, stock_count
      into v_price, v_name, v_image, v_stock
      from public.products where id = v_pid;
    if not found then raise exception 'Unknown product %', v_pid; end if;
    if v_stock < v_qty then
      raise exception 'Insufficient stock for % (have %, need %)', v_name, v_stock, v_qty;
    end if;

    select price into v_lensprice from public.lens_options where type = v_lens;
    if not found then v_lensprice := 0; end if;

    v_unit := v_price + v_lensprice;
    v_subtotal := v_subtotal + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_pid, 'lens_type', v_lens, 'quantity', v_qty,
      'unit_price', v_unit, 'line_total', v_unit * v_qty,
      'product_name', v_name, 'product_image', v_image
    );
  end loop;

  -- Gold membership: 5% off + free shipping.
  v_member := public.is_member(auth.uid());
  if v_member then v_memberd := floor(v_subtotal * 0.05); end if;

  -- Coupon applied on the post-member subtotal.
  if p_coupon is not null and p_coupon <> '' then
    v_coupon := public.validate_coupon(p_coupon, v_subtotal - v_memberd);
    if (v_coupon->>'valid')::boolean then v_coupond := (v_coupon->>'discount')::int; end if;
    v_couponmsg := v_coupon->>'message';
  end if;

  -- Loyalty points redemption (1 point = ₹1), capped at the balance and the
  -- post-member/coupon goods value so the goods total can reach zero but not go
  -- negative. Shipping is charged separately and not covered by points.
  v_pts_bal := coalesce((select points from public.profiles where id = auth.uid()), 0);
  v_pts_redeem := least(greatest(coalesce(p_redeem_points, 0), 0), v_pts_bal, greatest(0, v_subtotal - v_memberd - v_coupond));

  v_discount := v_memberd + v_coupond + v_pts_redeem;
  v_shipping := case when v_member or (v_subtotal - v_discount) >= 999 then 0 else 99 end;
  v_total := greatest(0, v_subtotal - v_discount) + v_shipping;

  -- Points earned: 1 per ₹100 actually paid; Gold members earn 2×.
  v_pts_earn := floor(v_total / 100.0)::int * (case when v_member then 2 else 1 end);

  return jsonb_build_object(
    'subtotal', v_subtotal, 'member', v_member, 'member_discount', v_memberd,
    'coupon_discount', v_coupond, 'coupon_message', v_couponmsg,
    'points_balance', v_pts_bal, 'points_redeemed', v_pts_redeem, 'points_earned', v_pts_earn,
    'discount', v_discount, 'shipping', v_shipping,
    'total', v_total, 'lines', v_lines
  );
end;
$$;

create or replace function public.place_order(
  p_items jsonb,
  p_payment_method text,
  p_address jsonb,
  p_payment_id text default null,
  p_payment_status text default 'pending',
  p_coupon text default null,
  p_redeem_points integer default 0
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_amount jsonb;
  v_order  uuid;
  line     jsonb;
  v_redeem integer;
  v_earn   integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  -- Lock product rows so the stock check + decrement is atomic.
  perform 1 from public.products
    where id in (select x->>'product_id' from jsonb_array_elements(p_items) x)
    for update;

  v_amount := public.compute_order_amount(p_items, p_coupon, p_redeem_points);  -- re-validates stock + points under lock
  v_redeem := (v_amount->>'points_redeemed')::int;
  v_earn   := (v_amount->>'points_earned')::int;

  insert into public.orders (user_id, status, total, discount, coupon, address, payment_method, payment_id, payment_status, points_earned, points_redeemed)
    values (v_uid, 'confirmed', (v_amount->>'total')::int, (v_amount->>'discount')::int,
            nullif(p_coupon, ''), p_address, p_payment_method, p_payment_id, p_payment_status, v_earn, v_redeem)
    returning id into v_order;

  for line in select * from jsonb_array_elements(v_amount->'lines') loop
    insert into public.order_items (order_id, product_id, product_name, product_image, quantity, lens_type, price)
      values (v_order, line->>'product_id', line->>'product_name', line->>'product_image',
              (line->>'quantity')::int, line->>'lens_type', (line->>'unit_price')::int);
    update public.products
      set stock_count = greatest(0, stock_count - (line->>'quantity')::int)
      where id = line->>'product_id';
  end loop;

  -- Apply the points ledger: subtract redeemed, add earned. Clamped at zero.
  update public.profiles
    set points = greatest(0, points - v_redeem + v_earn)
    where id = v_uid;

  return v_order;
end;
$$;

grant execute on function public.compute_order_amount(jsonb, text, integer) to anon, authenticated;
grant execute on function public.place_order(jsonb, text, jsonb, text, text, text, integer) to authenticated;
grant execute on function public.validate_coupon(text, integer) to anon, authenticated;
grant execute on function public.is_member(uuid) to anon, authenticated;

-- ── Product Images storage bucket ────────────────────────────
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do nothing;
create policy "Public read product images" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "Admins upload product images" on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));
create policy "Admins update product images" on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin(auth.uid()));
create policy "Admins delete product images" on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin(auth.uid()));

-- ── Enable Realtime ──────────────────────────────────────────
-- In the Supabase dashboard → Database → Replication, enable realtime for:
--   public.orders   (for live order status updates)
--   public.products (for live inventory / stock changes)
-- Or run:
-- alter publication supabase_realtime add table public.orders;
-- alter publication supabase_realtime add table public.products;

-- ── Seed Products ────────────────────────────────────────────
-- (Mirrors data/products.ts — run once after schema creation)
insert into public.products (id,name,brand,category,price,original_price,rating,reviews,image,images,frame_shape,material,color,colors,gender,is_new,is_best_seller,is_premium,has_try_on,specs,description,tags,stock_count) values
('1','Allen Classic Round','AllenEyeCare','eyeglasses',2499,3999,4.8,342,'https://placehold.co/400x300/0D1B2A/C9A84C.png?text=Allen+Classic','{"https://placehold.co/400x300/0D1B2A/C9A84C.png?text=Front+View","https://placehold.co/400x300/1A2F4A/E8D5A3.png?text=Side+View","https://placehold.co/400x300/162236/C9A84C.png?text=Detail+View"}','round','acetate','Midnight Black','{"#1C1C1E","#8B4513","#2F4F4F"}','unisex',false,true,false,true,'{"size":"Medium","weight":"18g","lensWidth":"50mm","bridgeWidth":"20mm","templeLength":"145mm"}','Timeless round frames crafted from premium Italian acetate. Perfect for everyday sophistication.','{"bestseller","round","unisex"}',100),
('2','Soleil Aviator Pro','AllenEyeCare','sunglasses',3799,5499,4.9,521,'https://placehold.co/400x300/1A1A2E/F59E0B.png?text=Soleil+Aviator','{"https://placehold.co/400x300/1A1A2E/F59E0B.png?text=Front","https://placehold.co/400x300/2A2A3E/F8D78A.png?text=Side","https://placehold.co/400x300/0A0A1E/FFB347.png?text=Detail"}','aviator','titanium','Gold','{"#C9A84C","#1C1C1E","#C0C0C0"}','unisex',true,false,true,true,'{"size":"Large","weight":"22g","lensWidth":"58mm","bridgeWidth":"14mm","templeLength":"140mm"}','Premium titanium aviators with UV400 polarized lenses. Your summer essential.','{"premium","aviator","polarized"}',100),
('3','Lumière Cat-Eye','Lumière','eyeglasses',1899,2799,4.7,218,'https://placehold.co/400x300/2D1B69/E879F9.png?text=Lumiere+Cat-Eye','{"https://placehold.co/400x300/2D1B69/E879F9.png?text=Front","https://placehold.co/400x300/3D2B79/F0ABFC.png?text=Side","https://placehold.co/400x300/1D0B59/D946EF.png?text=Detail"}','cat-eye','acetate','Violet Blush','{"#7C3AED","#EC4899","#1C1C1E"}','women',true,false,false,true,'{"size":"Small","weight":"15g","lensWidth":"48mm","bridgeWidth":"18mm","templeLength":"140mm"}','Bold cat-eye frames that frame your face with elegance. Inspired by Parisian fashion.','{"cat-eye","women","bold"}',100),
('4','Executive Rectangle','AllenEyeCare','eyeglasses',2199,3299,4.6,189,'https://placehold.co/400x300/0D1B2A/FFFFFF.png?text=Executive','{"https://placehold.co/400x300/0D1B2A/FFFFFF.png?text=Front","https://placehold.co/400x300/1A2F4A/F3F4F6.png?text=Side"}','rectangle','titanium','Silver Chrome','{"#C0C0C0","#1C1C1E","#C9A84C"}','men',false,true,false,false,'{"size":"Large","weight":"16g","lensWidth":"54mm","bridgeWidth":"18mm","templeLength":"145mm"}','Precision-engineered titanium frames for the modern professional. Ultra-lightweight.','{"office","men","titanium"}',100),
('5','Breeze Daily Contacts','ClearView','contacts',899,1199,4.5,876,'https://placehold.co/400x300/E0F2FE/0284C7.png?text=Daily+Contacts','{"https://placehold.co/400x300/E0F2FE/0284C7.png?text=30+Day+Pack","https://placehold.co/400x300/BAE6FD/0369A1.png?text=Detail"}','round','silicon','Clear','{"#E0F2FE"}','unisex',false,true,false,false,'{"size":"14.0mm","weight":"0g","lensWidth":"14mm","bridgeWidth":"0mm","templeLength":"0mm"}','Ultra-comfortable daily disposable lenses with 55% water content. 30 lens pack.','{"daily","contacts","comfortable"}',100),
('6','Junior Flex Kids','KidVision','kids',1299,1799,4.8,134,'https://placehold.co/400x300/FEF3C7/F59E0B.png?text=Kids+Flex','{"https://placehold.co/400x300/FEF3C7/F59E0B.png?text=Front","https://placehold.co/400x300/FDE68A/D97706.png?text=Side"}','oval','tr90','Sunny Yellow','{"#F59E0B","#EF4444","#3B82F6","#10B981"}','kids',true,false,false,false,'{"size":"Kids S","weight":"12g","lensWidth":"44mm","bridgeWidth":"16mm","templeLength":"125mm"}','Flexible, unbreakable TR90 frames designed for active kids. Spring hinges for durability.','{"kids","flexible","unbreakable"}',100),
('7','Havana Wayfarer Classic','RayStyle','sunglasses',2899,4199,4.7,445,'https://placehold.co/400x300/78350F/FEF3C7.png?text=Havana+Wayfarer','{"https://placehold.co/400x300/78350F/FEF3C7.png?text=Front","https://placehold.co/400x300/92400E/FDE68A.png?text=Side"}','wayfarer','acetate','Havana Tortoise','{"#78350F","#1C1C1E","#7C3AED"}','unisex',false,true,false,true,'{"size":"Medium","weight":"24g","lensWidth":"52mm","bridgeWidth":"18mm","templeLength":"145mm"}','Iconic wayfarer silhouette in premium havana acetate. A timeless wardrobe staple.','{"wayfarer","classic","sunglasses"}',100),
('8','Zen Oval Rimless','AllenEyeCare','eyeglasses',3299,null,4.9,92,'https://placehold.co/400x300/F3F4F6/374151.png?text=Zen+Rimless','{"https://placehold.co/400x300/F3F4F6/374151.png?text=Front","https://placehold.co/400x300/E5E7EB/4B5563.png?text=Side"}','oval','titanium','Crystal Clear','{"#C0C0C0","#C9A84C"}','unisex',false,false,true,true,'{"size":"Medium","weight":"10g","lensWidth":"51mm","bridgeWidth":"17mm","templeLength":"140mm"}','Ultra-lightweight rimless design. Barely-there frames that let your face shine.','{"rimless","premium","lightweight"}',100),
('9','Night Shield Blue Light','ScreenGuard','eyeglasses',1599,2299,4.4,567,'https://placehold.co/400x300/1E3A5F/93C5FD.png?text=Blue+Light','{"https://placehold.co/400x300/1E3A5F/93C5FD.png?text=Front","https://placehold.co/400x300/1E40AF/BFDBFE.png?text=Lens+Detail"}','rectangle','tr90','Navy Blue','{"#1E3A5F","#1C1C1E","#374151"}','unisex',false,true,false,false,'{"size":"Medium","weight":"14g","lensWidth":"52mm","bridgeWidth":"17mm","templeLength":"140mm"}','Advanced blue-light filtering lenses for screen protection. Reduce eye strain by 60%.','{"blue-light","screen","work-from-home"}',100),
('10','Monarch Hexagonal','AllenEyeCare','sunglasses',4599,null,5.0,47,'https://placehold.co/400x300/0D1B2A/C9A84C.png?text=Monarch+Hex','{"https://placehold.co/400x300/0D1B2A/C9A84C.png?text=Front","https://placehold.co/400x300/1A2F4A/E8D5A3.png?text=Side"}','round','titanium','Gold Black','{"#C9A84C","#1C1C1E"}','men',true,false,true,true,'{"size":"Large","weight":"19g","lensWidth":"55mm","bridgeWidth":"15mm","templeLength":"145mm"}','Hexagonal titanium masterpiece. Hand-crafted for those who define elegance.','{"premium","luxury","exclusive"}',100),
('11','Flora Round Women','Lumière','eyeglasses',1699,2499,4.6,203,'https://placehold.co/400x300/FDF2F8/EC4899.png?text=Flora+Round','{"https://placehold.co/400x300/FDF2F8/EC4899.png?text=Front","https://placehold.co/400x300/FCE7F3/DB2777.png?text=Side"}','round','acetate','Rose Blush','{"#EC4899","#9CA3AF","#C9A84C"}','women',true,false,false,true,'{"size":"Small","weight":"14g","lensWidth":"47mm","bridgeWidth":"17mm","templeLength":"135mm"}','Delicately crafted round frames with floral-inspired acetate patterns.','{"women","round","floral"}',100),
('12','Sport Wrap Active','AthleteVision','sunglasses',2199,3199,4.5,312,'https://placehold.co/400x300/052E16/4ADE80.png?text=Sport+Wrap','{"https://placehold.co/400x300/052E16/4ADE80.png?text=Front","https://placehold.co/400x300/064E3B/34D399.png?text=Side"}','oval','tr90','Racing Green','{"#052E16","#1C1C1E","#DC2626"}','unisex',false,true,false,false,'{"size":"Large","weight":"28g","lensWidth":"62mm","bridgeWidth":"12mm","templeLength":"130mm"}','Aerodynamic wrap-around frames with polarized sport lenses. Built for performance.','{"sport","polarized","active"}',100);

-- ============================================================
-- MIGRATION for an EXISTING database (run once in the SQL Editor).
-- Safe to re-run: uses IF NOT EXISTS / drop-then-create for policies.
-- (A brand-new project that ran everything above can SKIP this block.)
-- ============================================================
-- alter table public.profiles add column if not exists is_admin boolean not null default false;
-- alter table public.orders   add column if not exists payment_id text;
-- alter table public.orders   add column if not exists payment_status text not null default 'pending';
--
-- create or replace function public.is_admin(uid uuid)
-- returns boolean language sql security definer stable set search_path = public as $mig$
--   select coalesce((select is_admin from public.profiles where id = uid), false);
-- $mig$;
--
-- create table if not exists public.lens_options (
--   type text primary key, label text not null, price integer not null default 0);
-- alter table public.lens_options enable row level security;
-- insert into public.lens_options (type,label,price) values
--   ('non-powered','Non-Powered',0),('single-vision','Single Vision',399),
--   ('bifocal','Bifocal',699),('progressive','Progressive',999)
--   on conflict (type) do update set price = excluded.price, label = excluded.label;
-- drop policy if exists "Anyone can read lens options" on public.lens_options;
-- create policy "Anyone can read lens options" on public.lens_options for select using (true);
-- drop policy if exists "Admins manage lens options" on public.lens_options;
-- create policy "Admins manage lens options" on public.lens_options for all
--   using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
--
-- drop policy if exists "Admins manage products" on public.products;
-- create policy "Admins manage products" on public.products for all
--   using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
-- drop policy if exists "Admins read all orders" on public.orders;
-- create policy "Admins read all orders" on public.orders for select using (public.is_admin(auth.uid()));
-- drop policy if exists "Admins update orders" on public.orders;
-- create policy "Admins update orders" on public.orders for update using (public.is_admin(auth.uid()));
-- drop policy if exists "Admins read all order items" on public.order_items;
-- create policy "Admins read all order items" on public.order_items for select using (public.is_admin(auth.uid()));
--
-- Then paste the compute_order_amount(...) and place_order(...) function bodies
-- (and their grants) from the section above, plus the storage.buckets insert and
-- the four "product-images" storage.objects policies.
--
-- ── Phase 1 (search/recs/events) migration ──
-- create extension if not exists pg_trgm;
-- alter table public.products add column if not exists frame_size text;
-- alter table public.products add column if not exists face_shapes text[] not null default '{}';
-- create index if not exists products_name_trgm  on public.products using gin (name gin_trgm_ops);
-- create index if not exists products_brand_trgm on public.products using gin (brand gin_trgm_ops);
-- create index if not exists products_tags_gin   on public.products using gin (tags);
-- create index if not exists products_face_gin   on public.products using gin (face_shapes);
-- create table if not exists public.events (
--   id uuid default gen_random_uuid() primary key,
--   user_id uuid references auth.users on delete cascade,
--   type text not null, product_id text,
--   created_at timestamptz not null default now());
-- alter table public.events enable row level security;
-- drop policy if exists "Users insert own events" on public.events;
-- create policy "Users insert own events" on public.events for insert with check (auth.uid() = user_id);
-- drop policy if exists "Users read own events" on public.events;
-- create policy "Users read own events" on public.events for select using (auth.uid() = user_id);
-- drop policy if exists "Admins read all events" on public.events;
-- create policy "Admins read all events" on public.events for select using (public.is_admin(auth.uid()));
-- Then paste the search_products / product_suggestions / recommended_products function
-- bodies + their grants from the "Search & recommendations" section above.
--
-- ── Phase 2 (lenses + prescriptions) migration ──
-- alter table public.lens_options add column if not exists vision_type text not null default 'single-vision';
-- alter table public.lens_options add column if not exists tier text not null default 'Standard';
-- alter table public.lens_options add column if not exists description text not null default '';
--   (Then re-run the lens_options INSERT above with `on conflict (type) do update set
--    price = excluded.price, label = excluded.label, vision_type = excluded.vision_type,
--    tier = excluded.tier, description = excluded.description` to add the new package tiers.)
-- (Create the public.prescriptions table + its RLS policy from the section above.)
--
-- ── Phase 4 (membership / coupons / reviews / returns) migration ──
-- alter table public.orders add column if not exists discount integer not null default 0;
-- alter table public.orders add column if not exists coupon text;
-- Create tables memberships, coupons, reviews, return_requests (+ their RLS, the
-- reviews_set_verified trigger, the coupons seed) from the sections above, then
-- RE-RUN the compute_order_amount(jsonb, text) + place_order(jsonb, text, jsonb,
-- text, text, text) bodies and their grants (signatures changed — Postgres keeps
-- the old overloads, so also: drop function if exists public.compute_order_amount(jsonb);
-- drop function if exists public.place_order(jsonb, text, jsonb, text, text);).
--
-- ── Remote push (optional) ──
-- Deploy supabase/functions/send-push, set PUSH_WEBHOOK_SECRET, and add a Database
-- Webhook on public.orders UPDATE that POSTs the row to it (header x-webhook-secret).

-- ============================================================
-- Phase 5 (loyalty points) migration — RUN THIS BLOCK ONCE in the SQL Editor
-- on an existing database. (A brand-new project that ran everything above already
-- has it.) Safe to re-run. ₹100 spent = 1 point; 1 point = ₹1 off; Gold earns 2×.
-- ============================================================
alter table public.orders add column if not exists points_earned   integer not null default 0;
alter table public.orders add column if not exists points_redeemed integer not null default 0;

-- The signatures change (extra integer arg), so drop the old overloads first to
-- avoid PostgREST ambiguity.
drop function if exists public.place_order(jsonb, text, jsonb, text, text, text);
drop function if exists public.compute_order_amount(jsonb, text);

create or replace function public.compute_order_amount(p_items jsonb, p_coupon text default null, p_redeem_points integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item jsonb; v_pid text; v_lens text; v_qty integer; v_price integer; v_lensprice integer;
  v_name text; v_image text; v_stock integer; v_unit integer; v_subtotal integer := 0;
  v_lines jsonb := '[]'::jsonb; v_member boolean; v_memberd integer := 0;
  v_coupon jsonb; v_coupond integer := 0; v_couponmsg text := null; v_discount integer;
  v_shipping integer; v_total integer; v_pts_bal integer := 0; v_pts_redeem integer := 0; v_pts_earn integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'No items provided';
  end if;
  for item in select * from jsonb_array_elements(p_items) loop
    v_pid := item->>'product_id'; v_lens := coalesce(item->>'lens_type', 'non-powered');
    v_qty := coalesce((item->>'quantity')::int, 0);
    if v_qty < 1 then raise exception 'Invalid quantity for product %', v_pid; end if;
    select price, name, image, stock_count into v_price, v_name, v_image, v_stock from public.products where id = v_pid;
    if not found then raise exception 'Unknown product %', v_pid; end if;
    if v_stock < v_qty then raise exception 'Insufficient stock for % (have %, need %)', v_name, v_stock, v_qty; end if;
    select price into v_lensprice from public.lens_options where type = v_lens;
    if not found then v_lensprice := 0; end if;
    v_unit := v_price + v_lensprice; v_subtotal := v_subtotal + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object('product_id', v_pid, 'lens_type', v_lens, 'quantity', v_qty,
      'unit_price', v_unit, 'line_total', v_unit * v_qty, 'product_name', v_name, 'product_image', v_image);
  end loop;
  v_member := public.is_member(auth.uid());
  if v_member then v_memberd := floor(v_subtotal * 0.05); end if;
  if p_coupon is not null and p_coupon <> '' then
    v_coupon := public.validate_coupon(p_coupon, v_subtotal - v_memberd);
    if (v_coupon->>'valid')::boolean then v_coupond := (v_coupon->>'discount')::int; end if;
    v_couponmsg := v_coupon->>'message';
  end if;
  v_pts_bal := coalesce((select points from public.profiles where id = auth.uid()), 0);
  v_pts_redeem := least(greatest(coalesce(p_redeem_points, 0), 0), v_pts_bal, greatest(0, v_subtotal - v_memberd - v_coupond));
  v_discount := v_memberd + v_coupond + v_pts_redeem;
  v_shipping := case when v_member or (v_subtotal - v_discount) >= 999 then 0 else 99 end;
  v_total := greatest(0, v_subtotal - v_discount) + v_shipping;
  v_pts_earn := floor(v_total / 100.0)::int * (case when v_member then 2 else 1 end);
  return jsonb_build_object('subtotal', v_subtotal, 'member', v_member, 'member_discount', v_memberd,
    'coupon_discount', v_coupond, 'coupon_message', v_couponmsg,
    'points_balance', v_pts_bal, 'points_redeemed', v_pts_redeem, 'points_earned', v_pts_earn,
    'discount', v_discount, 'shipping', v_shipping, 'total', v_total, 'lines', v_lines);
end; $$;

create or replace function public.place_order(
  p_items jsonb, p_payment_method text, p_address jsonb, p_payment_id text default null,
  p_payment_status text default 'pending', p_coupon text default null, p_redeem_points integer default 0
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_amount jsonb; v_order uuid; line jsonb; v_redeem integer; v_earn integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  perform 1 from public.products where id in (select x->>'product_id' from jsonb_array_elements(p_items) x) for update;
  v_amount := public.compute_order_amount(p_items, p_coupon, p_redeem_points);
  v_redeem := (v_amount->>'points_redeemed')::int; v_earn := (v_amount->>'points_earned')::int;
  insert into public.orders (user_id, status, total, discount, coupon, address, payment_method, payment_id, payment_status, points_earned, points_redeemed)
    values (v_uid, 'confirmed', (v_amount->>'total')::int, (v_amount->>'discount')::int, nullif(p_coupon, ''),
            p_address, p_payment_method, p_payment_id, p_payment_status, v_earn, v_redeem)
    returning id into v_order;
  for line in select * from jsonb_array_elements(v_amount->'lines') loop
    insert into public.order_items (order_id, product_id, product_name, product_image, quantity, lens_type, price)
      values (v_order, line->>'product_id', line->>'product_name', line->>'product_image',
              (line->>'quantity')::int, line->>'lens_type', (line->>'unit_price')::int);
    update public.products set stock_count = greatest(0, stock_count - (line->>'quantity')::int) where id = line->>'product_id';
  end loop;
  update public.profiles set points = greatest(0, points - v_redeem + v_earn) where id = v_uid;
  return v_order;
end; $$;

grant execute on function public.compute_order_amount(jsonb, text, integer) to anon, authenticated;
grant execute on function public.place_order(jsonb, text, jsonb, text, text, text, integer) to authenticated;
