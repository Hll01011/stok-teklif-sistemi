-- Passwordless stock and quote module.
-- Existing finance tables are intentionally untouched.

create table if not exists public.stock_categories (
 id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now()
);
create table if not exists public.stock_products (
 id uuid primary key default gen_random_uuid(), product_code text not null unique, product_name text not null,
 category_id uuid references public.stock_categories(id) on delete set null, unit text not null default 'adet',
 stock_quantity numeric(14,3) not null default 0, critical_stock_level numeric(14,3) not null default 0,
 purchase_price numeric(14,4) not null default 0, sale_price numeric(14,4) not null default 0,
 currency text not null default 'TRY', pricing_mode text not null default 'PERCENT' check(pricing_mode in ('PERCENT','FIXED')),
 pricing_value numeric(14,4) not null default 0, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.stock_movements (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.stock_products(id) on delete cascade,
 movement_type text not null check(movement_type in ('IN','OUT','ADJUSTMENT')), quantity numeric(14,3) not null,
 unit_price numeric(14,4) not null default 0, currency text not null default 'TRY', description text, quote_id uuid,
 created_at timestamptz not null default now()
);
create table if not exists public.quote_customers (
 id uuid primary key default gen_random_uuid(), name text not null, contact_name text, phone text, email text, address text,
 created_at timestamptz not null default now()
);
create table if not exists public.stock_quotes (
 id uuid primary key default gen_random_uuid(), quote_number text not null unique,
 customer_id uuid references public.quote_customers(id) on delete set null, customer_name text not null,
 quote_date date not null default current_date, valid_until date,
 status text not null default 'DRAFT' check(status in ('DRAFT','SENT','APPROVED','CANCELLED')),
 currency text not null default 'TRY', subtotal numeric(14,2) not null default 0, vat_total numeric(14,2) not null default 0,
 grand_total numeric(14,2) not null default 0, notes text, stock_applied boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.stock_quote_items (
 id uuid primary key default gen_random_uuid(), quote_id uuid not null references public.stock_quotes(id) on delete cascade,
 product_id uuid references public.stock_products(id) on delete set null, product_code text not null, product_name text not null,
 unit text not null, quantity numeric(14,3) not null check(quantity>0), unit_price numeric(14,4) not null default 0,
 vat_rate numeric(6,2) not null default 20, line_total numeric(14,2) not null default 0, created_at timestamptz not null default now()
);
alter table public.stock_categories disable row level security;
alter table public.stock_products disable row level security;
alter table public.stock_movements disable row level security;
alter table public.quote_customers disable row level security;
alter table public.stock_quotes disable row level security;
alter table public.stock_quote_items disable row level security;
grant usage on schema public to anon, authenticated;
grant select,insert,update,delete on public.stock_categories,public.stock_products,public.stock_movements,public.quote_customers,public.stock_quotes,public.stock_quote_items to anon,authenticated;

create or replace function public.apply_stock_movement(p_product_id uuid,p_movement_type text,p_quantity numeric,p_unit_price numeric default 0,p_currency text default 'TRY',p_description text default null,p_quote_id uuid default null)
returns void language plpgsql as $$
declare v_new numeric; begin
 if p_quantity<=0 then raise exception 'Miktar sıfırdan büyük olmalıdır'; end if;
 update public.stock_products set stock_quantity=case when p_movement_type='IN' then stock_quantity+p_quantity when p_movement_type='OUT' then stock_quantity-p_quantity when p_movement_type='ADJUSTMENT' then p_quantity else stock_quantity end,updated_at=now()
 where id=p_product_id returning stock_quantity into v_new;
 if not found then raise exception 'Ürün bulunamadı'; end if;
 if v_new<0 then raise exception 'Yetersiz stok'; end if;
 insert into public.stock_movements(product_id,movement_type,quantity,unit_price,currency,description,quote_id) values(p_product_id,p_movement_type,p_quantity,p_unit_price,p_currency,p_description,p_quote_id);
end $$;

create or replace function public.approve_stock_quote(p_quote_id uuid)
returns void language plpgsql as $$
declare q record;i record;begin
 select * into q from public.stock_quotes where id=p_quote_id for update;
 if not found then raise exception 'Teklif bulunamadı'; end if;
 if q.stock_applied then raise exception 'Bu teklifin stoğu zaten düşülmüş'; end if;
 if q.status='CANCELLED' then raise exception 'İptal edilmiş teklif onaylanamaz'; end if;
 for i in select * from public.stock_quote_items where quote_id=p_quote_id loop
   perform public.apply_stock_movement(i.product_id,'OUT',i.quantity,i.unit_price,q.currency,'Teklif onayı: '||q.quote_number,p_quote_id);
 end loop;
 update public.stock_quotes set status='APPROVED',stock_applied=true where id=p_quote_id;
end $$;
grant execute on function public.apply_stock_movement(uuid,text,numeric,numeric,text,text,uuid) to anon,authenticated;
grant execute on function public.approve_stock_quote(uuid) to anon,authenticated;
