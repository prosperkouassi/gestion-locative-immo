-- Allow active agency administrators to update only their own organization.
-- This migration is idempotent with the policy that may already exist remotely.

drop policy if exists "organizations_update_admin_agency"
on public.organizations;

create policy "organizations_update_admin_agency"
on public.organizations
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role = 'ADMIN_AGENCY'
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role = 'ADMIN_AGENCY'
  )
);
