create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  category text,
  stock numeric(14,3) not null default 0,
  min_stock numeric(14,3) not null default 5,
  unit text not null default 'adet',
  purchase numeric(14,2) not null default 0,
  sale numeric(14,2) not null default 0,
  vat numeric(5,2) not null default 20,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, code)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  contact text,
  phone text,
  email text,
  tax_no text,
  tax_office text,
  address text,
  type text not null default 'Müşteri' check(type in ('Müşteri','Tedarikçi','Her İkisi')),
  balance numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quote_no text not null,
  customer_id uuid references public.customers(id) on delete set null,
  date date not null default current_date,
  valid_until date,
  items_count integer not null default 0,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  currency text not null default 'TRY',
  status text not null default 'Bekliyor' check(status in ('Taslak','Bekliyor','Onaylandı','Reddedildi','İptal')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, quote_no)
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_code text,
  product_name text not null,
  quantity numeric(14,3) not null default 1,
  unit text not null default 'adet',
  unit_price numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  vat numeric(5,2) not null default 20,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  type text not null check(type in ('Giriş','Çıkış','Sayım','Devir','İade')),
  qty numeric(14,3) not null,
  unit_cost numeric(14,2) not null default 0,
  note text,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists products_user_name_idx on public.products(user_id, name);
create index if not exists customers_user_name_idx on public.customers(user_id, name);
create index if not exists quotes_user_date_idx on public.quotes(user_id, date desc);
create index if not exists movements_user_date_idx on public.stock_movements(user_id, created_at desc);
create index if not exists quote_items_quote_idx on public.quote_items(quote_id);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();
drop trigger if exists quotes_touch on public.quotes;
create trigger quotes_touch before update on public.quotes for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id) values(new.id) on conflict do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for all using(auth.uid()=id) with check(auth.uid()=id);
drop policy if exists products_owner on public.products;
create policy products_owner on public.products for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists customers_owner on public.customers;
create policy customers_owner on public.customers for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists quotes_owner on public.quotes;
create policy quotes_owner on public.quotes for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists movements_owner on public.stock_movements;
create policy movements_owner on public.stock_movements for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists quote_items_owner on public.quote_items;
create policy quote_items_owner on public.quote_items for all using(exists(select 1 from public.quotes q where q.id=quote_items.quote_id and q.user_id=auth.uid())) with check(exists(select 1 from public.quotes q where q.id=quote_items.quote_id and q.user_id=auth.uid()));

create or replace function public.apply_stock_movement() returns trigger language plpgsql security definer set search_path=public as $$
declare delta numeric;
begin
  if new.type in ('Giriş','İade','Devir') then delta:=new.qty; elsif new.type='Çıkış' then delta:=-new.qty; else return new; end if;
  if new.product_id is not null then update public.products set stock=stock+delta, updated_at=now() where id=new.product_id and user_id=new.user_id; end if;
  return new;
end $$;
drop trigger if exists stock_movement_apply on public.stock_movements;
create trigger stock_movement_apply after insert on public.stock_movements for each row execute function public.apply_stock_movement();

comment on table public.products is 'Stok kartları';
comment on table public.customers is 'Cari kartları';
comment on table public.quotes is 'Teklif üst bilgileri';
comment on table public.quote_items is 'Teklif kalemleri';
comment on table public.stock_movements is 'Stok giriş çıkış hareketleri';
