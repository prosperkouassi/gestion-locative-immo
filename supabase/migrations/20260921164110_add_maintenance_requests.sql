-- ============================================================
-- Alteract
-- Module : Maintenance / Interventions
-- Migration : add_maintenance_requests
-- ============================================================


-- ============================================================
-- ENUM : maintenance_priority
-- ============================================================

do $$
begin
  create type public.maintenance_priority as enum (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
  );
exception
  when duplicate_object then null;
end
$$;


-- ============================================================
-- ENUM : maintenance_status
-- ============================================================

do $$
begin
  create type public.maintenance_status as enum (
    'OPEN',
    'IN_PROGRESS',
    'PLANNED',
    'COMPLETED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end
$$;


-- ============================================================
-- TABLE : maintenance_requests
-- ============================================================

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  property_id uuid,
  unit_id uuid,

  title text not null,
  description text,

  priority public.maintenance_priority
    not null
    default 'MEDIUM',

  status public.maintenance_status
    not null
    default 'OPEN',

  reported_at timestamptz
    not null
    default now(),

  scheduled_for date,
  completed_at timestamptz,

  estimated_cost numeric(12,2)
    check (
      estimated_cost is null
      or estimated_cost >= 0
    ),

  actual_cost numeric(12,2)
    check (
      actual_cost is null
      or actual_cost >= 0
    ),

  currency text
    not null
    default 'XOF',

  provider_name text,
  provider_phone text,

  notes text,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint maintenance_requests_property_fk
    foreign key (
      organization_id,
      property_id
    )
    references public.properties(
      organization_id,
      id
    )
    on delete restrict,

  constraint maintenance_requests_unit_fk
    foreign key (
      organization_id,
      unit_id
    )
    references public.units(
      organization_id,
      id
    )
    on delete restrict,

  constraint maintenance_target_required
    check (
      property_id is not null
      or unit_id is not null
    )
);


-- ============================================================
-- INDEX
-- ============================================================

create unique index if not exists
maintenance_requests_org_id_id_key
on public.maintenance_requests (
  organization_id,
  id
);


create index if not exists
maintenance_requests_organization_id_idx
on public.maintenance_requests (
  organization_id
);


create index if not exists
maintenance_requests_property_id_idx
on public.maintenance_requests (
  property_id
);


create index if not exists
maintenance_requests_unit_id_idx
on public.maintenance_requests (
  unit_id
);


create index if not exists
maintenance_requests_status_idx
on public.maintenance_requests (
  organization_id,
  status
);


create index if not exists
maintenance_requests_reported_at_idx
on public.maintenance_requests (
  organization_id,
  reported_at desc
);


-- ============================================================
-- RLS
-- ============================================================

alter table public.maintenance_requests
enable row level security;


-- ============================================================
-- SELECT
-- ADMIN_AGENCY / MANAGER
-- ============================================================

drop policy if exists
"maintenance_requests_select_manager"
on public.maintenance_requests;

create policy "maintenance_requests_select_manager"
on public.maintenance_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id =
      maintenance_requests.organization_id

      and om.user_id = (
        select auth.uid()
      )

      and om.is_active = true

      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
);


-- ============================================================
-- INSERT
-- ADMIN_AGENCY / MANAGER
-- ============================================================

drop policy if exists
"maintenance_requests_insert_manager"
on public.maintenance_requests;

create policy "maintenance_requests_insert_manager"
on public.maintenance_requests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id =
      maintenance_requests.organization_id

      and om.user_id = (
        select auth.uid()
      )

      and om.is_active = true

      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
);


-- ============================================================
-- UPDATE
-- ADMIN_AGENCY / MANAGER
-- ============================================================

drop policy if exists
"maintenance_requests_update_manager"
on public.maintenance_requests;

create policy "maintenance_requests_update_manager"
on public.maintenance_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id =
      maintenance_requests.organization_id

      and om.user_id = (
        select auth.uid()
      )

      and om.is_active = true

      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id =
      maintenance_requests.organization_id

      and om.user_id = (
        select auth.uid()
      )

      and om.is_active = true

      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
);


-- ============================================================
-- DELETE
-- ADMIN_AGENCY / MANAGER
-- ============================================================

drop policy if exists
"maintenance_requests_delete_manager"
on public.maintenance_requests;

create policy "maintenance_requests_delete_manager"
on public.maintenance_requests
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id =
      maintenance_requests.organization_id

      and om.user_id = (
        select auth.uid()
      )

      and om.is_active = true

      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
);