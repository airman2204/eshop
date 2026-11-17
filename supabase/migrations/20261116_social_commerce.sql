-- ============================================================================
-- FOXDROP SOCIAL COMMERCE — MIGRACIÓN DE APARTADOS Y FLUJOS VISUALES
-- ============================================================================

-- 1. Tabla de apartados temporales de inventario (evita sobreventas sin ensuciar products)
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  phone TEXT NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'converted' | 'expired' | 'cancelled'
  expires_at TIMESTAMPTZ NOT NULL,
  order_id UUID NULL,
  payment_method TEXT NULL, -- 'mercadopago' | 'spei'
  spei_receipt_url TEXT NULL,
  spei_validation JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_res_active
  ON public.inventory_reservations(product_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_res_phone
  ON public.inventory_reservations(phone, status);

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_reservations' AND policyname = 'Permitir acceso a inventory_reservations'
  ) THEN
    CREATE POLICY "Permitir acceso a inventory_reservations"
      ON public.inventory_reservations FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Tabla de flujos visuales de React Flow para el Bot
CREATE TABLE IF NOT EXISTS public.bot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Social Commerce Default',
  is_active BOOLEAN DEFAULT true,
  system_prompt TEXT NULL,
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bot_flows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bot_flows' AND policyname = 'Permitir acceso a bot_flows'
  ) THEN
    CREATE POLICY "Permitir acceso a bot_flows"
      ON public.bot_flows FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
