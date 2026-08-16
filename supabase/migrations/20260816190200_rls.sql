-- Passwordless single-company mode.
-- The application has no user login, so the anon role is the application role.
-- RLS remains enabled, but access is intentionally scoped to the single shared system.

alter table public.stock_categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.stock_transactions enable row level security;

create policy categories_public on public.stock_categories for all to anon, authenticated using (true) with check (true);
create policy products_public on public.products for all to anon, authenticated using (true) with check (true);
create policy customers_public on public.customers for all to anon, authenticated using (true) with check (true);
create policy quotes_public on public.quotes for all to anon, authenticated using (true) with check (true);
create policy quote_items_public on public.quote_items for all to anon, authenticated using (true) with check (true);
create policy transactions_public_select on public.stock_transactions for select to anon, authenticated using (true);

-- Stock quantities and transaction logs are changed through the atomic SECURITY DEFINER RPCs.
revoke insert, update, delete on public.stock_transactions from anon, authenticated;
revoke update on public.products from anon, authenticated;
grant select, insert, update on public.products to anon, authenticated;
