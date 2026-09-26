-- Autorise les portails OWNER et TENANT à lire uniquement les échéances
-- rattachées à des baux qu'ils sont déjà autorisés à consulter.
--
-- La fonction public.portal_can_read_lease(uuid) existe déjà et applique
-- les règles suivantes :
-- - OWNER : seulement les baux de ses propres biens ;
-- - TENANT : seulement ses propres baux.
--
-- Les règles manager existantes restent inchangées.

drop policy if exists rent_schedules_portal_select
on public.rent_schedules;

create policy rent_schedules_portal_select
on public.rent_schedules
as permissive
for select
to authenticated
using (
  public.portal_can_read_lease(lease_id)
);
