-- Preview compatibility: older migration history expects products.name.
-- Keep product_name as the application field and mirror it into this legacy field.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name text;

UPDATE public.products
SET name = product_name
WHERE name IS NULL;

CREATE INDEX IF NOT EXISTS products_name_idx
  ON public.products(name);