-- Autorise un locataire actif à créer une demande de maintenance
-- uniquement pour une unité qu'il est autorisé à consulter.
--
-- Les policies ADMIN_AGENCY / MANAGER existantes restent inchangées.
-- OWNER reste en lecture seule pour cette étape.

create or replace function public.portal_can_create_maintenance_request(
  target_organization_id uuid,
  target_property_id uuid,
  target_unit_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.units u
    join public.organization_members om
      on om.organization_id = u.organization_id
     and om.user_id = auth.uid()
     and om.is_active = true
    where u.id = target_unit_id
      and u.organization_id = target_organization_id
      and u.property_id = target_property_id
      and om.role = 'TENANT'
      and public.portal_can_read_unit(u.id)
  );
$$;

revoke all
on function public.portal_can_create_maintenance_request(uuid, uuid, uuid)
from public;

grant execute
on function public.portal_can_create_maintenance_request(uuid, uuid, uuid)
to authenticated;

drop policy if exists maintenance_requests_portal_insert
on public.maintenance_requests;

create policy maintenance_requests_portal_insert
on public.maintenance_requests
as permissive
for insert
to authenticated
with check (
  public.portal_can_create_maintenance_request(
    organization_id,
    property_id,
    unit_id
  )
);
