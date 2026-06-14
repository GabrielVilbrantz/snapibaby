-- SnapiBaby Database Schema
-- Execute no SQL Editor do Supabase

-- ===== TABELA DE PEDIDOS =====
CREATE TABLE IF NOT EXISTS orders (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Customer info
  customer_name   TEXT,
  customer_email  TEXT NOT NULL,

  -- Plan info
  plan            TEXT NOT NULL CHECK (plan IN ('starter', 'classic', 'premium')),
  base_price      NUMERIC(10,2) NOT NULL,
  bump_added      BOOLEAN DEFAULT FALSE,
  upsell_added    BOOLEAN DEFAULT FALSE,
  downsell_added  BOOLEAN DEFAULT FALSE,
  total_paid      NUMERIC(10,2) NOT NULL,

  -- Stripe
  stripe_payment_intent TEXT,
  stripe_customer_id    TEXT,
  stripe_payment_method TEXT,
  payment_status  TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),

  -- Generation
  themes_selected   JSONB,         -- array of theme names chosen by user
  baby_photo_urls   JSONB,         -- Supabase Storage URLs of uploaded baby photos
  generated_urls    JSONB,         -- KIE AI output image URLs
  upsell_themes     JSONB,         -- holiday themes bought in upsell/downsell
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending','processing','done','failed')),
  download_url      TEXT,          -- final gallery URL

  -- Meta
  order_number    TEXT UNIQUE,   -- SN-XXXXX display ID
  notes           TEXT
);

-- ===== MIGRATION: add upsell_themes if not exists =====
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='upsell_themes') THEN
    ALTER TABLE orders ADD COLUMN upsell_themes JSONB;
  END IF;
END $$;

-- ===== TABELA DE EMAIL BACKUPS =====
CREATE TABLE IF NOT EXISTS email_backups (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_id       UUID REFERENCES orders(id),
  customer_name  TEXT,
  customer_email TEXT NOT NULL,
  sent_at        TIMESTAMP WITH TIME ZONE,
  status         TEXT DEFAULT 'pending'
);

-- ===== ÍNDICES PARA PERFORMANCE =====
CREATE INDEX IF NOT EXISTS orders_email_idx    ON orders (customer_email);
CREATE INDEX IF NOT EXISTS orders_stripe_idx   ON orders (stripe_payment_intent);
CREATE INDEX IF NOT EXISTS orders_status_idx   ON orders (generation_status);
CREATE INDEX IF NOT EXISTS orders_payment_idx  ON orders (payment_status);

-- ===== ROW LEVEL SECURITY (RLS) =====
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_backups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (safe to re-run)
DROP POLICY IF EXISTS "anon can insert order"            ON orders;
DROP POLICY IF EXISTS "service_role full access orders"  ON orders;
DROP POLICY IF EXISTS "service_role full access backups" ON email_backups;

CREATE POLICY "anon can insert order" ON orders
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "service_role full access orders" ON orders
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access backups" ON email_backups
  TO service_role USING (true) WITH CHECK (true);

-- ===== FUNÇÃO: gerar número de pedido =====
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'SN-' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists before recreating
DROP TRIGGER IF EXISTS set_order_number ON orders;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();
