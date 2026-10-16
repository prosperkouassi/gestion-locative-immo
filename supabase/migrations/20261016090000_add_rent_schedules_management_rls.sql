-- Gestion des échéances par ADMIN_AGENCY et MANAGER.

alter table public.rent_schedules enable row level security;

drop policy if exists rent_schedules_admin_manager_insert
on public.rent_schedules;

drop policy if exists rent_schedules_admin_manager_update
on public.rent_schedules;

drop policy if exists rent_schedules_admin_manager_delete
on public.rent_schedules;

create policy rent_schedules_admin_manager_insert
on public.rent_schedules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id =
        rent_schedules.organization_id
      and om.is_active = true
      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
);

create policy rent_schedules_admin_manager_update
on public.rent_schedules
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id =
        rent_schedules.organization_id
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
        rent_schedules.organization_id
      and om.is_active = true
      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
);

create policy rent_schedules_admin_manager_delete
on public.rent_schedules
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id =
        rent_schedules.organization_id
      and om.is_active = true
      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
);
