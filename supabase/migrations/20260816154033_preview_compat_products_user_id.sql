-- Preview compatibility: older migration history expects products.user_id and products.name.
-- Keep the current application fields (created_by/product_name) while providing legacy columns.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name text;

UPDATE public.products
SET user_id = created_by
WHERE user_id IS NULL
  AND created_by IS NOT NULL;

UPDATE public.products
SET name = product_name
WHERE name IS NULL;

CREATE INDEX IF NOT EXISTS products_user_name_idx
  ON public.products(user_id, name);