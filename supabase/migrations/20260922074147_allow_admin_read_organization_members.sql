-- Allow active agency administrators to read the members and profiles
-- that belong to their own organization only.
-- Existing self-read policies are preserved.

drop policy if exists "organization_members_select_admin_agency"
on public.organization_members;

create policy "organization_members_select_admin_agency"
on public.organization_members
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members current_member
    where current_member.organization_id = organization_members.organization_id
      and current_member.user_id = auth.uid()
      and current_member.is_active = true
      and current_member.role = 'ADMIN_AGENCY'
  )
);

drop policy if exists "profiles_select_admin_agency_members"
on public.profiles;

create policy "profiles_select_admin_agency_members"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members target_member
    join public.organization_members current_member
      on current_member.organization_id = target_member.organization_id
    where target_member.user_id = profiles.id
      and current_member.user_id = auth.uid()
      and current_member.is_active = true
      and current_member.role = 'ADMIN_AGENCY'
  )
);
