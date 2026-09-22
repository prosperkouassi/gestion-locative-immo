-- Prevent recursive RLS checks on organization_members by moving
-- the current-user admin membership lookup into a SECURITY DEFINER function.
-- The function is not directly executable by public/authenticated users.

create or replace function public.is_admin_of_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role = 'ADMIN_AGENCY'
  );
$$;

revoke all on function public.is_admin_of_organization(uuid) from public;
revoke all on function public.is_admin_of_organization(uuid) from authenticated;

drop policy if exists "organization_members_select_admin_agency"
on public.organization_members;

create policy "organization_members_select_admin_agency"
on public.organization_members
for select
to authenticated
using (
  public.is_admin_of_organization(organization_members.organization_id)
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
    where target_member.user_id = profiles.id
      and public.is_admin_of_organization(target_member.organization_id)
  )
);
