-- Bloc 3 — Paiements et remboursements.
-- Écriture réservée aux ADMIN_AGENCY et MANAGER actifs.
-- Les remboursements restent append-only : pas d'UPDATE ni de DELETE.

alter table public.payments
enable row level security;

alter table public.payment_refunds
enable row level security;

drop policy if exists
payments_admin_manager_insert
on public.payments;

drop policy if exists
payments_admin_manager_update
on public.payments;

create policy
payments_admin_manager_insert
on public.payments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id =
        payments.organization_id
      and om.is_active = true
      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
  and exists (
    select 1
    from public.rent_schedules rs
    where rs.id =
      payments.rent_schedule_id
      and rs.organization_id =
        payments.organization_id
  )
);

create policy
payments_admin_manager_update
on public.payments
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id =
        payments.organization_id
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
    where om.user_id = auth.uid()
      and om.organization_id =
        payments.organization_id
      and om.is_active = true
      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
  and exists (
    select 1
    from public.rent_schedules rs
    where rs.id =
      payments.rent_schedule_id
      and rs.organization_id =
        payments.organization_id
  )
);

drop policy if exists
payment_refunds_admin_manager_select
on public.payment_refunds;

drop policy if exists
payment_refunds_admin_manager_insert
on public.payment_refunds;

create policy
payment_refunds_admin_manager_select
on public.payment_refunds
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id =
        payment_refunds.organization_id
      and om.is_active = true
      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
);

create policy
payment_refunds_admin_manager_insert
on public.payment_refunds
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id =
        payment_refunds.organization_id
      and om.is_active = true
      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
  and exists (
    select 1
    from public.payments p
    where p.id =
      payment_refunds.payment_id
      and p.organization_id =
        payment_refunds.organization_id
  )
);
