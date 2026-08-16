-- Passwordless single-company business rules.

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
  p_transaction_type text,
  p_quantity numeric,
  p_unit_price numeric default 0,
  p_currency text default 'TRY',
  p_description text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_product public.products;
  v_new_stock numeric;
  v_owner uuid := '00000000-0000-0000-0000-000000000001';
begin
  if p_quantity is null or p_quantity <= 0 then raise exception 'INVALID_QUANTITY'; end if;
  select * into v_product from public.products where id = p_product_id and is_active = true for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;

  if p_transaction_type = 'IN' or p_transaction_type = 'RETURN' then
    v_new_stock := v_product.stock_quantity + p_quantity;
  elsif p_transaction_type = 'OUT' then
    if v_product.stock_quantity < p_quantity then raise exception 'INSUFFICIENT_STOCK: %', v_product.product_name; end if;
    v_new_stock := v_product.stock_quantity - p_quantity;
  elsif p_transaction_type = 'ADJUSTMENT' then
    v_new_stock := p_quantity;
  else
    raise exception 'INVALID_TRANSACTION_TYPE';
  end if;

  update public.products set stock_quantity = v_new_stock, updated_at = now() where id = p_product_id;
  insert into public.stock_transactions(product_id, transaction_type, quantity, unit_price, currency, description, created_by)
  values(p_product_id, p_transaction_type, p_quantity, coalesce(p_unit_price,0), coalesce(p_currency,'TRY'), p_description, v_owner);
end;
$$;

grant execute on function public.apply_stock_transaction(uuid, text, numeric, numeric, text, text) to anon, authenticated;

create or replace function public.approve_quote(p_quote_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  q public.quotes;
  i record;
  p public.products;
  v_owner uuid := '00000000-0000-0000-0000-000000000001';
begin
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then raise exception 'QUOTE_NOT_FOUND'; end if;
  if q.status = 'APPROVED' then return; end if;
  if q.status not in ('DRAFT','SENT') then raise exception 'QUOTE_NOT_APPROVABLE'; end if;

  for i in select * from public.quote_items where quote_id = p_quote_id loop
    select * into p from public.products where id = i.product_id and is_active = true for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND: %', i.product_name; end if;
    if p.stock_quantity < i.quantity then raise exception 'INSUFFICIENT_STOCK: % (mevcut % %)', i.product_name, p.stock_quantity, p.unit; end if;
  end loop;

  for i in select * from public.quote_items where quote_id = p_quote_id loop
    update public.products set stock_quantity = stock_quantity - i.quantity, updated_at = now() where id = i.product_id;
    insert into public.stock_transactions(product_id, transaction_type, quantity, unit_price, currency, description, created_by)
    values(i.product_id, 'OUT', i.quantity, i.unit_price, q.currency, 'Teklif onayı: ' || q.quote_number, v_owner);
  end loop;

  update public.quotes set status = 'APPROVED', updated_at = now() where id = p_quote_id;
end;
$$;

grant execute on function public.approve_quote(uuid) to anon, authenticated;

create or replace function public.next_quote_number()
returns text language plpgsql security invoker as $$
declare
  v_count integer;
  v_owner uuid := '00000000-0000-0000-0000-000000000001';
begin
  select count(*) + 1 into v_count from public.quotes where created_by = v_owner;
  return 'TKL-' || to_char(current_date,'YYYY') || '-' || lpad(v_count::text,5,'0');
end;
$$;

grant execute on function public.next_quote_number() to anon, authenticated;
