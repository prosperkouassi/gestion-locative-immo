-- Alteract Super Admin: schéma isolé du domaine métier.
create table if not exists public.alteract_platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.alteract_platform_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  contact_email text,
  kind text not null default 'agency' check (kind in ('agency','landlord','company')),
  status text not null default 'active' check (status in ('active','suspended')),
  plan text not null default 'free' check (plan in ('free','silver','gold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.alteract_platform_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  action text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_alteract_clients_created on public.alteract_platform_clients(created_at desc);
create index if not exists idx_alteract_audit_created on public.alteract_platform_audit(created_at desc);
alter table public.alteract_platform_admins enable row level security;
alter table public.alteract_platform_clients enable row level security;
alter table public.alteract_platform_audit enable row level security;
-- Aucune politique utilisateur : accès uniquement par service role côté serveur après contrôle explicite.
revoke all on public.alteract_platform_admins from anon, authenticated;
revoke all on public.alteract_platform_clients from anon, authenticated;
revoke all on public.alteract_platform_audit from anon, authenticated;
