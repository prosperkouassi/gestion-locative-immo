-- Autorise les portails OWNER et TENANT à lire uniquement les demandes
-- de maintenance qui concernent leurs biens / logements.
--
-- Règles :
-- - OWNER : peut lire les demandes liées à ses propriétés ou unités ;
-- - TENANT : peut lire uniquement les demandes liées à une unité
--   qu'il est autorisé à consulter ;
-- - ADMIN_AGENCY / MANAGER : continuent d'utiliser les policies existantes.
--
-- L'écriture côté TENANT n'est volontairement pas ouverte ici.
-- Nous la traiterons séparément après validation de la lecture.

create or replace function public.portal_can_read_maintenance_request(
  target_request_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.maintenance_requests mr
    join public.organization_members om
      on om.organization_id = mr.organization_id
     and om.user_id = auth.uid()
     and om.is_active = true
    where mr.id = target_request_id
      and (
        (
          om.role = 'OWNER'
          and (
            (
              mr.unit_id is not null
              and public.portal_can_read_unit(mr.unit_id)
            )
            or
            (
              mr.property_id is not null
              and public.portal_can_read_property(mr.property_id)
            )
          )
        )
        or
        (
          om.role = 'TENANT'
          and mr.unit_id is not null
          and public.portal_can_read_unit(mr.unit_id)
        )
      )
  );
$$;

revoke all
on function public.portal_can_read_maintenance_request(uuid)
from public;

grant execute
on function public.portal_can_read_maintenance_request(uuid)
to authenticated;

drop policy if exists maintenance_requests_portal_select
on public.maintenance_requests;

create policy maintenance_requests_portal_select
on public.maintenance_requests
as permissive
for select
to authenticated
using (
  public.portal_can_read_maintenance_request(id)
);
