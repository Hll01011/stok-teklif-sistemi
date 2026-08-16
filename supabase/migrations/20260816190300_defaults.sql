-- Passwordless default categories for the single-company application.
create or replace function public.ensure_default_categories()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.stock_categories(name, created_by)
  select x, v_user from unnest(array[
    'Pano','Havalandırma','Yemleme','Sulama','Elektrik','Kablo','Otomasyon','Sensör','Aydınlatma','Fan','Motor','Pano Malzemeleri','Kümes Ekipmanları','Diğer'
  ]) x
  where not exists(select 1 from public.stock_categories c where c.created_by = v_user and c.name = x);
end;
$$;
revoke all on function public.ensure_default_categories() from public;
grant execute on function public.ensure_default_categories() to anon, authenticated;
