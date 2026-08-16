-- Product unit support for stock and quotation workflows.
-- Keep this migration idempotent so Supabase Preview can build a fresh database.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'adet';

UPDATE public.products
SET unit = CASE
  WHEN product_code IN ('CABLE-3X1.5','KAB-001','KAB-002','KAB-003','KABLO-4X2.5','KABLO-5X10','KABLO-KONT','KABLO-TAVA','PANO-TAVA') THEN 'm'
  WHEN product_code IN ('MONTAJ-ELEK','MONTAJ-FAN','MONTAJ-PANO','MUHENDISLIK','DEVREYE') THEN 'iş'
  ELSE COALESCE(NULLIF(unit,''),'adet')
END;
