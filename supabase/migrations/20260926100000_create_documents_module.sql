-- Module Documents : table métier + RLS.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'document_type'
      and n.nspname = 'public'
  ) then
    create type public.document_type as enum (
      'LEASE',
      'RECEIPT',
      'QUITTANCE',
      'INVOICE',
      'IDENTITY',
      'PROPERTY',
      'MAINTENANCE',
      'OTHER'
    );
  end if;
end
$$;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  owner_id uuid null
    references public.owners(id)
    on delete set null,

  tenant_id uuid null
    references public.tenants(id)
    on delete set null,

  property_id uuid null
    references public.properties(id)
    on delete set null,

  unit_id uuid null
    references public.units(id)
    on delete set null,

  lease_id uuid null
    references public.leases(id)
    on delete set null,

  title text not null,

  document_type public.document_type not null
    default 'OTHER',

  storage_path text not null unique,
  mime_type text null,
  file_size bigint null,

  is_visible_to_owner boolean not null
    default false,

  is_visible_to_tenant boolean not null
    default false,

  created_by uuid null
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint documents_title_not_blank
    check (length(trim(title)) > 0),

  constraint documents_file_size_non_negative
    check (file_size is null or file_size >= 0)
);

create index if not exists documents_organization_id_idx
  on public.documents(organization_id);

create index if not exists documents_owner_id_idx
  on public.documents(owner_id);

create index if not exists documents_tenant_id_idx
  on public.documents(tenant_id);

create index if not exists documents_property_id_idx
  on public.documents(property_id);

create index if not exists documents_unit_id_idx
  on public.documents(unit_id);

create index if not exists documents_lease_id_idx
  on public.documents(lease_id);

alter table public.documents
enable row level security;

drop policy if exists documents_select_manager
on public.documents;

create policy documents_select_manager
on public.documents
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = documents.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);

drop policy if exists documents_insert_manager
on public.documents;

create policy documents_insert_manager
on public.documents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = documents.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);

drop policy if exists documents_update_manager
on public.documents;

create policy documents_update_manager
on public.documents
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = documents.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = documents.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);

drop policy if exists documents_delete_manager
on public.documents;

create policy documents_delete_manager
on public.documents
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = documents.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);

drop policy if exists documents_owner_select
on public.documents;

create policy documents_owner_select
on public.documents
for select
to authenticated
using (
  is_visible_to_owner = true
  and (
    (
      owner_id is not null
      and public.portal_can_read_owner(owner_id)
    )
    or
    (
      property_id is not null
      and public.portal_can_read_property(property_id)
    )
    or
    (
      unit_id is not null
      and public.portal_can_read_unit(unit_id)
    )
    or
    (
      lease_id is not null
      and public.portal_can_read_lease(lease_id)
    )
  )
);

drop policy if exists documents_tenant_select
on public.documents;

create policy documents_tenant_select
on public.documents
for select
to authenticated
using (
  is_visible_to_tenant = true
  and (
    (
      tenant_id is not null
      and public.portal_can_read_tenant(tenant_id)
    )
    or
    (
      unit_id is not null
      and public.portal_can_read_unit(unit_id)
    )
    or
    (
      lease_id is not null
      and public.portal_can_read_lease(lease_id)
    )
  )
);
