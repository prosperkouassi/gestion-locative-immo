-- Autorise les portails OWNER et TENANT à lire uniquement les paiements
-- rattachés à des échéances appartenant à des baux qu'ils sont autorisés
-- à consulter.
--
-- Chaîne de contrôle :
-- payments.rent_schedule_id
-- -> rent_schedules.lease_id
-- -> public.portal_can_read_lease(lease_id)
--
-- Les policies manager existantes restent inchangées.

create or replace function public.portal_can_read_payment(
  target_payment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.payments p
    join public.rent_schedules rs
      on rs.id = p.rent_schedule_id
    where p.id = target_payment_id
      and public.portal_can_read_lease(rs.lease_id)
  );
$$;

revoke all on function public.portal_can_read_payment(uuid) from public;
grant execute on function public.portal_can_read_payment(uuid) to authenticated;

drop policy if exists payments_portal_select
on public.payments;

create policy payments_portal_select
on public.payments
as permissive
for select
to authenticated
using (
  public.portal_can_read_payment(id)
);