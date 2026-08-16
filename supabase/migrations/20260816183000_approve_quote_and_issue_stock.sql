create or replace function public.approve_quote_and_issue_stock(p_quote_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.quotes%rowtype;
  v_item record;
  v_product public.products%rowtype;
  v_uid uuid := auth.uid();
  v_out jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Oturum açmanız gerekiyor.' using errcode = '42501';
  end if;

  select * into v_quote
  from public.quotes
  where id = p_quote_id
    and created_by = v_uid
  for update;

  if not found then
    raise exception 'Teklif bulunamadı veya bu teklif için yetkiniz yok.' using errcode = '42501';
  end if;

  if v_quote.status = 'APPROVED'::public.quote_status then
    return jsonb_build_object('ok', true, 'already_approved', true, 'quote_id', p_quote_id, 'message', 'Teklif daha önce onaylanmış.');
  end if;

  if v_quote.status in ('REJECTED'::public.quote_status, 'CANCELLED'::public.quote_status, 'EXPIRED'::public.quote_status) then
    raise exception 'Bu teklif mevcut durumu nedeniyle onaylanamaz.';
  end if;

  for v_item in
    select qi.*
    from public.quote_items qi
    where qi.quote_id = p_quote_id
      and qi.product_id is not null
    order by qi.product_id, qi.id
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id
      and is_active = true
      and created_by = v_uid
    for update;

    if not found then
      raise exception 'Teklifteki ürünlerden biri bulunamadı veya pasif.';
    end if;

    if coalesce(v_product.stock_quantity, 0) < coalesce(v_item.quantity, 0) then
      raise exception 'Yetersiz stok: % — mevcut %, gerekli %', v_product.product_name, coalesce(v_product.stock_quantity,0), coalesce(v_item.quantity,0);
    end if;

    update public.products
    set stock_quantity = stock_quantity - v_item.quantity,
        updated_at = now()
    where id = v_product.id;

    insert into public.stock_transactions
      (product_id, transaction_type, quantity, unit_price, currency, transaction_date, description, reference_no, created_by)
    values
      (v_product.id, 'OUT'::public.stock_transaction_type, v_item.quantity, v_item.unit_price, v_item.currency, now(),
       'Teklif onayı: ' || v_quote.quote_number, v_quote.quote_number, v_uid);

    v_out := v_out || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.product_name,
      'quantity', v_item.quantity,
      'remaining_stock', v_product.stock_quantity - v_item.quantity
    );
  end loop;

  update public.quotes
  set status = 'APPROVED'::public.quote_status,
      updated_at = now()
  where id = p_quote_id;

  return jsonb_build_object(
    'ok', true,
    'already_approved', false,
    'quote_id', p_quote_id,
    'quote_number', v_quote.quote_number,
    'items', v_out,
    'message', 'Teklif onaylandı ve stoklar düşüldü.'
  );
end;
$$;

revoke execute on function public.approve_quote_and_issue_stock(uuid) from public, anon;
grant execute on function public.approve_quote_and_issue_stock(uuid) to authenticated;
