-- Bloc 3 — Dépenses.
-- Écriture réservée aux ADMIN_AGENCY et MANAGER actifs.
-- Les politiques SELECT existantes ne sont pas supprimées afin de conserver
-- notamment la lecture OWNER déjà prévue par le portail.

alter table public.expenses
enable row level security;

drop policy if exists
expenses_admin_manager_insert
on public.expenses;

drop policy if exists
expenses_admin_manager_update
on public.expenses;

drop policy if exists
expenses_admin_manager_delete
on public.expenses;

create policy
expenses_admin_manager_insert
on public.expenses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = expenses.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
  and (
    expenses.property_id is null
    or exists (
      select 1
      from public.properties p
      where p.id = expenses.property_id
        and p.organization_id = expenses.organization_id
    )
  )
  and (
    expenses.unit_id is null
    or exists (
      select 1
      from public.units u
      where u.id = expenses.unit_id
        and u.organization_id = expenses.organization_id
        and (
          expenses.property_id is null
          or u.property_id = expenses.property_id
        )
    )
  )
);

create policy
expenses_admin_manager_update
on public.expenses
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = expenses.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = expenses.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
  and (
    expenses.property_id is null
    or exists (
      select 1
      from public.properties p
      where p.id = expenses.property_id
        and p.organization_id = expenses.organization_id
    )
  )
  and (
    expenses.unit_id is null
    or exists (
      select 1
      from public.units u
      where u.id = expenses.unit_id
        and u.organization_id = expenses.organization_id
        and (
          expenses.property_id is null
          or u.property_id = expenses.property_id
        )
    )
  )
);

create policy
expenses_admin_manager_delete
on public.expenses
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = expenses.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);
