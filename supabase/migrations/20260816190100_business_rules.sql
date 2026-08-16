-- 002_business_rules.sql

create or replace function public.calculate_product_sale_price(
  p_purchase_price numeric,
  p_mode public.pricing_mode,
  p_value numeric
) returns numeric language sql immutable as $$
  select case
    when p_mode = 'FIXED' then round(p_purchase_price + coalesce(p_value,0), 4)
    else round(p_purchase_price * (1 + coalesce(p_value,0) / 100), 4)
  end;
$$;

create or replace function public.apply_stock_transaction(
  p_product_id uuid,
  p_transaction_type public.stock_transaction_type,
  p_quantity numeric,
  p_unit_price numeric default 0,
  p_currency text default 'TRY',
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_description text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_product public.products;
  v_new_stock numeric;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'INVALID_QUANTITY'; end if;

  select * into v_product from public.products
  where id = p_product_id and created_by = auth.uid() and is_active = true
  for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;

  if p_transaction_type in ('IN','RETURN') then
    v_new_stock := v_product.stock_quantity + p_quantity;
  elsif p_transaction_type = 'OUT' then
    if v_product.stock_quantity < p_quantity then raise exception 'INSUFFICIENT_STOCK'; end if;
    v_new_stock := v_product.stock_quantity - p_quantity;
  else
    v_new_stock := p_quantity;
  end if;

  update public.products set stock_quantity = v_new_stock where id = p_product_id;

  insert into public.stock_transactions(product_id, transaction_type, quantity, unit_price, currency, reference_type, reference_id, description, created_by)
  values(p_product_id, p_transaction_type, p_quantity, coalesce(p_unit_price,0), p_currency, p_reference_type, p_reference_id, p_description, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.apply_stock_transaction(uuid, public.stock_transaction_type, numeric, numeric, text, text, uuid, text) from public;
grant execute on function public.apply_stock_transaction(uuid, public.stock_transaction_type, numeric, numeric, text, text, uuid, text) to authenticated;

create or replace function public.approve_quote(p_quote_id uuid)
returns public.quotes
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_quote public.quotes;
  v_item record;
  v_product public.products;
  v_total numeric := 0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_quote from public.quotes
  where id = p_quote_id and created_by = auth.uid()
  for update;
  if not found then raise exception 'QUOTE_NOT_FOUND'; end if;
  if v_quote.status = 'APPROVED' then return v_quote; end if;
  if v_quote.status not in ('DRAFT','SENT') then raise exception 'QUOTE_CANNOT_BE_APPROVED'; end if;

  for v_item in select * from public.quote_items where quote_id = p_quote_id order by id loop
    select * into v_product from public.products
    where id = v_item.product_id and created_by = auth.uid() and is_active = true
    for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
    if v_product.stock_quantity < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_product.product_name;
    end if;
    update public.products set stock_quantity = stock_quantity - v_item.quantity where id = v_item.product_id;
    insert into public.stock_transactions(product_id, transaction_type, quantity, unit_price, currency, reference_type, reference_id, description, created_by)
    values(v_item.product_id, 'OUT', v_item.quantity, v_item.unit_price, v_quote.currency, 'QUOTE', p_quote_id, 'Teklif onayı ile stok çıkışı', auth.uid());
    v_total := v_total + v_item.quantity;
  end loop;

  update public.quotes set status = 'APPROVED', updated_at = now() where id = p_quote_id returning * into v_quote;
  return v_quote;
end;
$$;

revoke all on function public.approve_quote(uuid) from public;
grant execute on function public.approve_quote(uuid) to authenticated;

create or replace function public.next_quote_number()
returns text language plpgsql security invoker as $$
declare
  v_count integer;
begin
  select count(*) + 1 into v_count from public.quotes where created_by = auth.uid();
  return 'TKL-' || to_char(current_date,'YYYY') || '-' || lpad(v_count::text,5,'0');
end;
$$;
