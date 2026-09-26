-- Autorise les portails OWNER et TENANT à lire les justificatifs générés
-- uniquement lorsqu'ils sont rattachés à un bail qu'ils sont autorisés à consulter.
--
-- Chaînes de contrôle :
-- receipts.payment_id
-- -> payments.rent_schedule_id
-- -> rent_schedules.lease_id
-- -> public.portal_can_read_lease(lease_id)
--
-- rent_quittances.rent_schedule_id
-- -> rent_schedules.lease_id
-- -> public.portal_can_read_lease(lease_id)
--
-- Les policies manager existantes restent inchangées.

create or replace function public.portal_can_read_receipt(
  target_receipt_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.receipts r
    join public.payments p
      on p.id = r.payment_id
    join public.rent_schedules rs
      on rs.id = p.rent_schedule_id
    where r.id = target_receipt_id
      and public.portal_can_read_lease(rs.lease_id)
  );
$$;

revoke all
on function public.portal_can_read_receipt(uuid)
from public;

grant execute
on function public.portal_can_read_receipt(uuid)
to authenticated;

create or replace function public.portal_can_read_quittance(
  target_quittance_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rent_quittances q
    join public.rent_schedules rs
      on rs.id = q.rent_schedule_id
    where q.id = target_quittance_id
      and public.portal_can_read_lease(rs.lease_id)
  );
$$;

revoke all
on function public.portal_can_read_quittance(uuid)
from public;

grant execute
on function public.portal_can_read_quittance(uuid)
to authenticated;

drop policy if exists receipts_portal_select
on public.receipts;

create policy receipts_portal_select
on public.receipts
as permissive
for select
to authenticated
using (
  public.portal_can_read_receipt(id)
);

drop policy if exists rent_quittances_portal_select
on public.rent_quittances;

create policy rent_quittances_portal_select
on public.rent_quittances
as permissive
for select
to authenticated
using (
  public.portal_can_read_quittance(id)
);
