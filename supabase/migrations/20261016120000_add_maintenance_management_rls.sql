-- Bloc 4 — Maintenance.
-- Les politiques SELECT et la politique INSERT TENANT existantes sont conservées.
-- Cette migration ajoute l'écriture complète ADMIN_AGENCY / MANAGER.

alter table public.maintenance_requests
enable row level security;

drop policy if exists
maintenance_admin_manager_insert
on public.maintenance_requests;

drop policy if exists
maintenance_admin_manager_update
on public.maintenance_requests;

drop policy if exists
maintenance_admin_manager_delete
on public.maintenance_requests;

create policy
maintenance_admin_manager_insert
on public.maintenance_requests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = maintenance_requests.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
  and (
    maintenance_requests.property_id is null
    or exists (
      select 1
      from public.properties p
      where p.id = maintenance_requests.property_id
        and p.organization_id = maintenance_requests.organization_id
    )
  )
  and (
    maintenance_requests.unit_id is null
    or exists (
      select 1
      from public.units u
      where u.id = maintenance_requests.unit_id
        and u.organization_id = maintenance_requests.organization_id
        and (
          maintenance_requests.property_id is null
          or u.property_id = maintenance_requests.property_id
        )
    )
  )
);

create policy
maintenance_admin_manager_update
on public.maintenance_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = maintenance_requests.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = maintenance_requests.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
  and (
    maintenance_requests.property_id is null
    or exists (
      select 1
      from public.properties p
      where p.id = maintenance_requests.property_id
        and p.organization_id = maintenance_requests.organization_id
    )
  )
  and (
    maintenance_requests.unit_id is null
    or exists (
      select 1
      from public.units u
      where u.id = maintenance_requests.unit_id
        and u.organization_id = maintenance_requests.organization_id
        and (
          maintenance_requests.property_id is null
          or u.property_id = maintenance_requests.property_id
        )
    )
  )
);

create policy
maintenance_admin_manager_delete
on public.maintenance_requests
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = maintenance_requests.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);
