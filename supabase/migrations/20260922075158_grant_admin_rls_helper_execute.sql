-- Allow authenticated users to execute the RLS helper used by policies.
-- The helper remains SECURITY DEFINER and still validates auth.uid()
-- against organization_members before returning true.

grant execute
on function public.is_admin_of_organization(uuid)
to authenticated;
