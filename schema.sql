-- =========================================================
-- FOXDROP — ESQUEMA COMPLETO SUPABASE
-- =========================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE PERFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin', 'repartidor')),
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. TABLA DE CATEGORÍAS
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 4. TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sku TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.categories(id),
    base_cost_usd NUMERIC(10, 2) DEFAULT 0.00,
    base_cost_mxn NUMERIC(10, 2) DEFAULT 0.00,
    shipping_cost_allocated NUMERIC(10, 2) DEFAULT 0.00,
    total_cost_mxn NUMERIC(10, 2) GENERATED ALWAYS AS (base_cost_mxn + shipping_cost_allocated) STORED,
    public_price NUMERIC(10, 2) NOT NULL,
    profit_unit NUMERIC(10, 2) GENERATED ALWAYS AS (public_price - (base_cost_mxn + shipping_cost_allocated)) STORED,
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    is_special_order BOOLEAN DEFAULT FALSE,
    images TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_combo BOOLEAN DEFAULT FALSE,
    combo_product_ids UUID[] DEFAULT '{}',
    days_in_stock INTEGER DEFAULT 0,
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 5. TABLA DE LOTES DE IMPORTACIÓN
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    batch_name TEXT NOT NULL,
    total_shipping_cost NUMERIC(10, 2) NOT NULL,
    total_units INTEGER NOT NULL CHECK (total_units > 0),
    cost_per_unit NUMERIC(10, 2) GENERATED ALWAYS AS (total_shipping_cost / total_units) STORED,
    notes TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 6. TABLA DE PEDIDOS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id),
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_type TEXT CHECK (shipping_type IN ('puebla_local', 'agreed_pickup', 'national_shipping')),
    pickup_point TEXT,
    shipping_cost NUMERIC(10, 2) DEFAULT 0.00,
    subtotal NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('spei', 'card', 'cash', 'mercadopago')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    shipping_address JSONB,
    tracking_number TEXT,
    tracking_url TEXT,
    whatsapp_notified BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 7. DETALLE DE PEDIDOS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    product_title TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase NUMERIC(10, 2) NOT NULL,
    cost_at_purchase NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 8. CARRITOS ABANDONADOS
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    client_name TEXT,
    client_phone TEXT,
    client_email TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    total NUMERIC(10, 2) DEFAULT 0,
    followed_up BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 9. ENCARGOS ESPECIALES
CREATE TABLE IF NOT EXISTS public.special_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_name TEXT,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'confirmed', 'rejected')),
    admin_notes TEXT,
    estimated_price NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 10. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_active ON public.abandoned_carts(last_active DESC);

-- 11. TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 12. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
DO $$
BEGIN
  DROP POLICY IF EXISTS "Perfiles propios select" ON public.profiles;
  DROP POLICY IF EXISTS "Perfiles propios update" ON public.profiles;
  DROP POLICY IF EXISTS "Productos publicos select" ON public.products;
  DROP POLICY IF EXISTS "Categorias publicas select" ON public.categories;
  DROP POLICY IF EXISTS "Pedidos propios select" ON public.orders;
  DROP POLICY IF EXISTS "Pedidos propios insert" ON public.orders;
  DROP POLICY IF EXISTS "Items de pedido select" ON public.order_items;
  DROP POLICY IF EXISTS "Special orders insert" ON public.special_orders;
END $$;

CREATE POLICY "Perfiles propios select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Perfiles propios update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Productos publicos select" ON public.products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Categorias publicas select" ON public.categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Pedidos propios select" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pedidos propios insert" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Items de pedido select" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Special orders insert" ON public.special_orders FOR INSERT WITH CHECK (TRUE);

-- 13. SEED DE CATEGORÍAS
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Electrónica', 'electronica', '💻', 1),
  ('Moda', 'moda', '👗', 2),
  ('Hogar', 'hogar', '🏠', 3),
  ('Cosmética', 'cosmetica', '💄', 4),
  ('Deportes', 'deportes', '🏋️', 5),
  ('Coleccionables', 'coleccionables', '🎁', 6)
ON CONFLICT (slug) DO NOTHING;

-- 14. SEED DE PRODUCTOS
INSERT INTO public.products (sku, title, description, category_id, base_cost_usd, base_cost_mxn, shipping_cost_allocated, public_price, stock, images)
SELECT
  'FX-WATCH-09',
  'Apple Watch Series 9 GPS 45mm',
  'El smartwatch más avanzado de Apple. Pantalla Retina Always-On, sensor de temperatura, detección de accidentes y hasta 18h de batería. Compatible con iPhone.',
  (SELECT id FROM public.categories WHERE slug = 'electronica'),
  210.00, 4200.00, 400.00, 6890.00, 5,
  ARRAY['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800']
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (sku, title, description, category_id, base_cost_usd, base_cost_mxn, shipping_cost_allocated, public_price, stock, images)
SELECT
  'FX-CAM-A7M4',
  'Sony Alpha a7 IV 4K Full-Frame',
  'Cámara mirrorless full-frame con sensor de 33 MP, video 4K60, estabilización de imagen en 5 ejes y AF con inteligencia artificial. Para fotógrafos serios.',
  (SELECT id FROM public.categories WHERE slug = 'electronica'),
  1350.00, 27000.00, 1800.00, 38900.00, 2,
  ARRAY['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800']
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (sku, title, description, category_id, base_cost_usd, base_cost_mxn, shipping_cost_allocated, public_price, stock, images)
SELECT
  'FX-PHONE-S24U',
  'Samsung Galaxy S24 Ultra 512GB',
  'El smartphone más poderoso de Samsung. S Pen integrado, zoom óptico 10x, pantalla Dynamic AMOLED 6.8" QHD+ 120Hz y batería de 5000 mAh.',
  (SELECT id FROM public.categories WHERE slug = 'electronica'),
  900.00, 18000.00, 1500.00, 24900.00, 3,
  ARRAY['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800']
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (sku, title, description, category_id, base_cost_usd, base_cost_mxn, shipping_cost_allocated, public_price, stock, images)
SELECT
  'FX-BAG-IT01',
  'Maletín Ejecutivo Cuero Italiano',
  'Maletín artesanal en genuino cuero italiano Vacchetta. Compartimento acolchado para laptop 15", organizador interno y herrajes en latón envejecido.',
  (SELECT id FROM public.categories WHERE slug = 'moda'),
  88.00, 1760.00, 320.00, 3450.00, 8,
  ARRAY['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800']
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (sku, title, description, category_id, base_cost_usd, base_cost_mxn, shipping_cost_allocated, public_price, stock, images)
SELECT
  'FX-WATCH-JP02',
  'Reloj Seiko Automático Tokio',
  'Reloj automático japonés con movimiento Seiko NH35. Cristal zafiro anti-rayones, resistente al agua 100m, correa de cuero genuino café oscuro.',
  (SELECT id FROM public.categories WHERE slug = 'moda'),
  160.00, 3200.00, 550.00, 5600.00, 4,
  ARRAY['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800']
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.products (sku, title, description, category_id, base_cost_usd, base_cost_mxn, shipping_cost_allocated, public_price, stock, images)
SELECT
  'FX-COSM-KR03',
  'Serum Facial Coreano de Arroz',
  'Sérum hidratante con extracto de arroz fermentado, niacinamida 10% y ácido hialurónico triple peso. Piel luminosa en 2 semanas. K-Beauty premium.',
  (SELECT id FROM public.categories WHERE slug = 'cosmetica'),
  12.00, 240.00, 70.00, 580.00, 20,
  ARRAY['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800']
ON CONFLICT (sku) DO NOTHING;

-- 15. ACTIVACIÓN DE SUPABASE REALTIME (ACTUALIZACIONES EN VIVO)
-- Permite que los cambios de pedidos se emitan por WebSocket en tiempo real hacia la tienda y el CRM
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.special_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.abandoned_carts;

-- 16. TABLAS DE WHATSAPP MULTI-SOCIO EN TIEMPO REAL
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    unread_count INTEGER DEFAULT 0,
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    client_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('client', 'admin')),
    sender_name TEXT, -- Ej. 'Mario', 'Socio B', 'FoxBot', 'Carlos'
    text TEXT NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'document', 'audio')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_phone ON public.whatsapp_chats(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_id ON public.whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at ASC);

-- Habilitar Realtime para chats y mensajes (ambos socios ven los mensajes al instante)
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
