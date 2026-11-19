-- ============================================================================
-- FoxDrop Agency Command Center — Supabase Schema & Realtime Publication
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Campañas Semanales
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  week_label text not null,
  theme text not null,
  goal text not null default 'Tráfico al grupo VIP de WhatsApp',
  status text not null default 'active' check (status in ('draft', 'active', 'completed')),
  created_at timestamptz not null default now()
);

-- 2. Estado en vivo de los 7 Agentes en el Mapa
create table if not exists public.agent_states (
  agent_id text primary key check (agent_id in ('mateo', 'valeria', 'diego', 'andres', 'camila', 'sofia', 'bruno')),
  name text not null,
  role text not null,
  current_x numeric not null,
  current_y numeric not null,
  status text not null default 'idle' check (status in ('idle', 'working', 'walking', 'waiting_approval')),
  speech_bubble text not null default '',
  updated_at timestamptz not null default now()
);

-- 3. Entregables / Piezas de Contenido
create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  platform text not null check (platform in ('instagram_reel', 'instagram_post', 'tiktok', 'meta_ad')),
  scheduled_date timestamptz,
  hook_text text not null default '',
  caption_text text not null default '',
  flux_prompt text not null default '',
  image_url text not null default '',
  status text not null default 'pending_approval' check (status in ('draft', 'pending_approval', 'approved', 'published', 'rejected')),
  created_by_agents text[] not null default '{}',
  feedback_notes text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4. Log de Actividad en Vivo (Traspasos entre agentes)
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  from_agent text not null,
  to_agent text not null default '',
  action_message text not null,
  created_at timestamptz not null default now()
);

-- 5. Métricas & ROI por Entregable
create table if not exists public.campaign_metrics (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid references public.deliverables(id) on delete cascade,
  reach int not null default 0,
  clicks_to_whatsapp int not null default 0,
  new_group_members int not null default 0,
  closed_sales_mxn numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Seed Inicial: 7 Agentes en sus coordenadas exactas
-- ============================================================================
insert into public.agent_states (agent_id, name, role, current_x, current_y, status, speech_bubble)
values
  ('mateo', 'Mateo', 'CMO', 19, 26, 'idle', 'Plan semanal listo'),
  ('valeria', 'Valeria', 'Copywriter', 15, 72, 'waiting_approval', 'Copy v2 lista'),
  ('diego', 'Diego', 'Director de Arte / Flux', 24, 72, 'working', 'Generando en Flux...'),
  ('andres', 'Andrés', 'Media Buyer', 74, 28, 'working', 'Ads en revisión'),
  ('camila', 'Camila', 'Community Manager', 85, 28, 'idle', 'Esperando piezas'),
  ('sofia', 'Sofía', 'Ejecutiva de Ventas WA', 78, 74, 'idle', '14 leads en grupo'),
  ('bruno', 'Bruno', 'Analista ROI', 74, 63, 'idle', 'ROI +18%')
on conflict (agent_id) do nothing;

-- ============================================================================
-- Habilitar Supabase Realtime en las 5 tablas
-- ============================================================================
alter publication supabase_realtime add table public.campaigns;
alter publication supabase_realtime add table public.agent_states;
alter publication supabase_realtime add table public.deliverables;
alter publication supabase_realtime add table public.activity_logs;
alter publication supabase_realtime add table public.campaign_metrics;
