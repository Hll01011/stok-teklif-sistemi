-- Preview compatibility: older migration history expects products.user_id.
-- Keep the current application model (created_by) while providing the legacy column.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.products
SET user_id = created_by
WHERE user_id IS NULL
  AND created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_user_name_idx
  ON public.products(user_id, name);