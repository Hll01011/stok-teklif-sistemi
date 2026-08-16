-- 003_rls.sql
alter table public.stock_categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.stock_transactions enable row level security;

create policy categories_select_own on public.stock_categories for select to authenticated using (created_by = auth.uid());
create policy categories_insert_own on public.stock_categories for insert to authenticated with check (created_by = auth.uid());
create policy categories_update_own on public.stock_categories for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy products_select_own on public.products for select to authenticated using (created_by = auth.uid());
create policy products_insert_own on public.products for insert to authenticated with check (created_by = auth.uid());
create policy products_update_own on public.products for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy customers_select_own on public.customers for select to authenticated using (created_by = auth.uid());
create policy customers_insert_own on public.customers for insert to authenticated with check (created_by = auth.uid());
create policy customers_update_own on public.customers for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy quotes_select_own on public.quotes for select to authenticated using (created_by = auth.uid());
create policy quotes_insert_own on public.quotes for insert to authenticated with check (created_by = auth.uid());
create policy quotes_update_own on public.quotes for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy quote_items_select_own_quote on public.quote_items for select to authenticated using (exists(select 1 from public.quotes q where q.id = quote_id and q.created_by = auth.uid()));
create policy quote_items_insert_own_quote on public.quote_items for insert to authenticated with check (exists(select 1 from public.quotes q where q.id = quote_id and q.created_by = auth.uid() and q.status in ('DRAFT','SENT')));
create policy quote_items_update_own_quote on public.quote_items for update to authenticated using (exists(select 1 from public.quotes q where q.id = quote_id and q.created_by = auth.uid() and q.status in ('DRAFT','SENT'))) with check (exists(select 1 from public.quotes q where q.id = quote_id and q.created_by = auth.uid() and q.status in ('DRAFT','SENT')));
create policy quote_items_delete_own_quote on public.quote_items for delete to authenticated using (exists(select 1 from public.quotes q where q.id = quote_id and q.created_by = auth.uid() and q.status in ('DRAFT','SENT')));

create policy stock_transactions_select_own on public.stock_transactions for select to authenticated using (created_by = auth.uid());

-- Direct stock mutation is intentionally blocked. Stock changes go through the atomic RPC.
revoke insert, update, delete on public.stock_transactions from authenticated;
revoke update on public.products from authenticated;
grant select, insert, update on public.products to authenticated;

-- SECURITY DEFINER functions are the only supported paths for stock movement.
