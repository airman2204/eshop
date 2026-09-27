-- =========================================================
-- ESQUEMA DE BASE DE DATOS SUPABASE (PRODUCTOS AMERICANOS CRM + ECOMMERCE)
-- Costo $0 USD - PostgreSQL con Row Level Security (RLS)
-- =========================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE PERFILES DE USUARIO
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin', 'repartidor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLA DE CATEGORÍAS
CREATE TABLE public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLA DE PRODUCTOS (CON COSTOS DE IMPORTACIÓN Y PRECIOS)
CREATE TABLE public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sku TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.categories(id),
    base_cost_usd NUMERIC(10, 2) DEFAULT 0.00, -- Costo en USA
    base_cost_mxn NUMERIC(10, 2) DEFAULT 0.00, -- Costo convertido
    shipping_cost_allocated NUMERIC(10, 2) DEFAULT 0.00, -- Prorrateo de envío por unidad
    total_cost_mxn NUMERIC(10, 2) GENERATED ALWAYS AS (base_cost_mxn + shipping_cost_allocated) STORED,
    public_price NUMERIC(10, 2) NOT NULL, -- Precio al público
    profit_unit NUMERIC(10, 2) GENERATED ALWAYS AS (public_price - (base_cost_mxn + shipping_cost_allocated)) STORED,
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    is_special_order BOOLEAN DEFAULT FALSE, -- Si es pedido especial bajo demanda
    images TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLA DE LOTES DE IMPORTACIÓN (ENVÍOS USA -> MX)
CREATE TABLE public.import_batches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    batch_name TEXT NOT NULL,
    total_shipping_cost NUMERIC(10, 2) NOT NULL, -- Costo total del envío de la caja/lote
    total_units INTEGER NOT NULL CHECK (total_units > 0),
    cost_per_unit NUMERIC(10, 2) GENERATED ALWAYS AS (total_shipping_cost / total_units) STORED,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLA DE PEDIDOS
CREATE TABLE public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_type TEXT CHECK (shipping_type IN ('puebla_local', 'agreed_pickup', 'national_shipping')),
    shipping_cost NUMERIC(10, 2) DEFAULT 0.00,
    subtotal NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    shipping_address JSONB,
    tracking_number TEXT,
    tracking_url TEXT,
    whatsapp_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. DETALLE DE PEDIDOS
CREATE TABLE public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase NUMERIC(10, 2) NOT NULL,
    cost_at_purchase NUMERIC(10, 2) NOT NULL
);

-- 8. ANALÍTICA DE VISITAS Y CARRITOS ABANDONADOS
CREATE TABLE public.abandoned_carts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    client_phone TEXT,
    items JSONB NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    followed_up BOOLEAN DEFAULT FALSE
);

-- HABILITAR RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
