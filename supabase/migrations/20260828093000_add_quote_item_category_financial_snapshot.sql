-- Quote PDF category and financial snapshot fields.
alter table public.stock_quote_items
  add column if not exists category_id uuid references public.stock_categories(id) on delete set null,
  add column if not exists category_name text,
  add column if not exists purchase_unit_price numeric(14,4) not null default 0;

-- Backfill existing quotes from the product catalog.
update public.stock_quote_items qi
set category_id = p.category_id,
    category_name = coalesce(c.name,'Diğer'),
    purchase_unit_price = coalesce(p.purchase_price, qi.purchase_unit_price, 0)
from public.stock_products p
left join public.stock_categories c on c.id=p.category_id
where qi.product_id=p.id
  and (qi.category_name is null or qi.category_id is null or qi.purchase_unit_price=0);

create index if not exists stock_quote_items_quote_category_idx
on public.stock_quote_items(quote_id, category_id);
