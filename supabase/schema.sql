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
  created_at     timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "Anyone can read products" on public.products for select using (true);

-- Decrement stock (called after order placement)
create or replace function public.decrement_stock(p_id text, qty integer)
returns void language sql security definer as $$
  update public.products
  set stock_count = greatest(0, stock_count - qty)
  where id = p_id;
$$;

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
  unique (user_id, product_id)
);
alter table public.cart_items enable row level security;
create policy "Users manage own cart" on public.cart_items for all using (auth.uid() = user_id);

-- ── Wishlists ────────────────────────────────────────────────
create table public.wishlists (
  user_id    uuid references auth.users on delete cascade,
  product_id text references public.products,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.wishlists enable row level security;
create policy "Users manage own wishlist" on public.wishlists for all using (auth.uid() = user_id);

-- ── Orders ───────────────────────────────────────────────────
create table public.orders (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users on delete cascade not null,
  status         text not null default 'confirmed',
  total          integer not null,
  address        jsonb,
  payment_method text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "Users read own orders"   on public.orders for select using (auth.uid() = user_id);
create policy "Users insert own orders" on public.orders for insert with check (auth.uid() = user_id);

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
