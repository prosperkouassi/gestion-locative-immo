-- Autorise ADMIN_AGENCY et MANAGER à gérer les baux
-- uniquement dans leur organisation active.

alter table public.leases enable row level security;

drop policy if exists leases_admin_manager_insert on public.leases;
drop policy if exists leases_admin_manager_update on public.leases;
drop policy if exists leases_admin_manager_delete on public.leases;

create policy leases_admin_manager_insert
on public.leases
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = leases.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);

create policy leases_admin_manager_update
on public.leases
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = leases.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = leases.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);

create policy leases_admin_manager_delete
on public.leases
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = leases.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);
