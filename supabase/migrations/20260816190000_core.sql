-- 001_core.sql
create extension if not exists pgcrypto;

do $ begin
  create type public.quote_status as enum ('DRAFT','SENT','APPROVED','REJECTED','CANCELLED','EXPIRED');
exception when duplicate_object then null;
end $;

do $ begin
  create type public.stock_transaction_type as enum ('IN','OUT','ADJUSTMENT','RETURN');
exception when duplicate_object then null;
end $;

do $ begin
  create type public.pricing_mode as enum ('PERCENT','FIXED');
exception when duplicate_object then null;
end $;

create table public.stock_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  product_code text not null,
  product_name text not null,
  category_id uuid not null references public.stock_categories(id) on delete restrict,
  unit text not null default 'adet',
  stock_quantity numeric(14,3) not null default 0,
  critical_stock_level numeric(14,3) not null default 10,
  purchase_price numeric(14,4) not null default 0,
  purchase_currency text not null default 'TRY' check (purchase_currency in ('TRY','USD')),
  sale_price numeric(14,4) not null default 0,
  sale_currency text not null default 'TRY' check (sale_currency in ('TRY','USD')),
  vat_rate numeric(5,2) not null default 20 check (vat_rate >= 0 and vat_rate <= 100),
  pricing_mode public.pricing_mode not null default 'PERCENT',
  pricing_value numeric(14,4) not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(created_by, product_code)
);

create index products_category_idx on public.products(category_id);
create index products_active_idx on public.products(created_by, is_active);
create index products_name_idx on public.products(created_by, product_name);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  address text,
  tax_office text,
  tax_number text,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_company_idx on public.customers(created_by, company_name);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  quote_date date not null default current_date,
  valid_until date,
  status public.quote_status not null default 'DRAFT',
  currency text not null default 'TRY' check (currency in ('TRY','USD')),
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(created_by, quote_number)
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_code text not null,
  product_name text not null,
  unit text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,4) not null check (unit_price >= 0),
  discount_rate numeric(5,2) not null default 0 check (discount_rate >= 0 and discount_rate <= 100),
  vat_rate numeric(5,2) not null default 20 check (vat_rate >= 0 and vat_rate <= 100),
  line_subtotal numeric(14,2) not null default 0,
  line_vat numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index quote_items_quote_idx on public.quote_items(quote_id);
create index quotes_customer_idx on public.quotes(customer_id);
create index quotes_status_idx on public.quotes(created_by, status);

create table public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  transaction_type public.stock_transaction_type not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,4) not null default 0,
  currency text not null default 'TRY' check (currency in ('TRY','USD')),
  reference_type text,
  reference_id uuid,
  description text,
  transaction_date timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index stock_transactions_product_idx on public.stock_transactions(product_id, transaction_date desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_updated_at before update on public.stock_categories for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger quotes_updated_at before update on public.quotes for each row execute function public.set_updated_at();
