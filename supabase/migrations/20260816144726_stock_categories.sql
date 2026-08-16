create table if not exists public.stock_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint stock_categories_name_key unique (name)
);

create index if not exists stock_categories_active_idx on public.stock_categories (is_active, name);

alter table public.stock_categories enable row level security;

drop policy if exists "stock_categories_select_authenticated" on public.stock_categories;
drop policy if exists "stock_categories_insert_authenticated" on public.stock_categories;
drop policy if exists "stock_categories_update_authenticated" on public.stock_categories;
drop policy if exists "stock_categories_delete_authenticated" on public.stock_categories;

create policy "stock_categories_select_authenticated" on public.stock_categories for select to authenticated using (true);
create policy "stock_categories_insert_authenticated" on public.stock_categories for insert to authenticated with check (true);
create policy "stock_categories_update_authenticated" on public.stock_categories for update to authenticated using (true) with check (true);
create policy "stock_categories_delete_authenticated" on public.stock_categories for delete to authenticated using (true);

insert into public.stock_categories (name)
values
  ('Pano'),('Havalandırma'),('Yemleme'),('Sulama'),('Elektrik'),('Kablo'),('Otomasyon'),('Sensör'),('Aydınlatma'),('Fan'),('Motor'),('Pano Malzemeleri'),('Kümes Ekipmanları'),('Diğer')
on conflict (name) do nothing;

create or replace function public.set_stock_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_stock_categories_updated_at on public.stock_categories;
create trigger trg_stock_categories_updated_at
before update on public.stock_categories
for each row execute function public.set_stock_categories_updated_at();