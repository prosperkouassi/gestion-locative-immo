-- Accès lecture portail OWNER / TENANT.
-- Cette migration complète les politiques RLS existantes sans modifier
-- les droits ADMIN_AGENCY / MANAGER déjà en place.

-- ---------------------------------------------------------------------------
-- Helpers SECURITY DEFINER
-- ---------------------------------------------------------------------------

create or replace function public.portal_can_read_owner(p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.owners o
    join public.organization_members om
      on om.organization_id = o.organization_id
     and om.user_id = auth.uid()
     and om.is_active = true
    where o.id = p_owner_id
      and o.auth_user_id = auth.uid()
      and om.role = 'OWNER'::public.organization_role
  );
$$;

create or replace function public.portal_can_read_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.properties p
    join public.organization_members om
      on om.organization_id = p.organization_id
     and om.user_id = auth.uid()
     and om.is_active = true
    left join public.owners o
      on o.id = p.owner_id
     and o.organization_id = p.organization_id
    where p.id = p_property_id
      and (
        (
          om.role = 'OWNER'::public.organization_role
          and o.auth_user_id = auth.uid()
        )
        or
        (
          om.role = 'TENANT'::public.organization_role
          and exists (
            select 1
            from public.units u
            join public.leases l
              on l.unit_id = u.id
             and l.organization_id = p.organization_id
            join public.tenants t
              on t.id = l.tenant_id
             and t.organization_id = p.organization_id
            where u.property_id = p.id
              and u.organization_id = p.organization_id
              and t.auth_user_id = auth.uid()
          )
        )
      )
  );
$$;

create or replace function public.portal_can_read_unit(p_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.units u
    join public.properties p
      on p.id = u.property_id
     and p.organization_id = u.organization_id
    join public.organization_members om
      on om.organization_id = u.organization_id
     and om.user_id = auth.uid()
     and om.is_active = true
    left join public.owners o
      on o.id = p.owner_id
     and o.organization_id = u.organization_id
    where u.id = p_unit_id
      and (
        (
          om.role = 'OWNER'::public.organization_role
          and o.auth_user_id = auth.uid()
        )
        or
        (
          om.role = 'TENANT'::public.organization_role
          and exists (
            select 1
            from public.leases l
            join public.tenants t
              on t.id = l.tenant_id
             and t.organization_id = u.organization_id
            where l.unit_id = u.id
              and l.organization_id = u.organization_id
              and t.auth_user_id = auth.uid()
          )
        )
      )
  );
$$;

create or replace function public.portal_can_read_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenants t
    join public.organization_members om
      on om.organization_id = t.organization_id
     and om.user_id = auth.uid()
     and om.is_active = true
    where t.id = p_tenant_id
      and (
        (
          om.role = 'TENANT'::public.organization_role
          and t.auth_user_id = auth.uid()
        )
        or
        (
          om.role = 'OWNER'::public.organization_role
          and exists (
            select 1
            from public.leases l
            join public.units u
              on u.id = l.unit_id
             and u.organization_id = t.organization_id
            join public.properties p
              on p.id = u.property_id
             and p.organization_id = t.organization_id
            join public.owners o
              on o.id = p.owner_id
             and o.organization_id = t.organization_id
            where l.tenant_id = t.id
              and l.organization_id = t.organization_id
              and o.auth_user_id = auth.uid()
          )
        )
      )
  );
$$;

create or replace function public.portal_can_read_lease(p_lease_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leases l
    join public.organization_members om
      on om.organization_id = l.organization_id
     and om.user_id = auth.uid()
     and om.is_active = true
    join public.tenants t
      on t.id = l.tenant_id
     and t.organization_id = l.organization_id
    join public.units u
      on u.id = l.unit_id
     and u.organization_id = l.organization_id
    join public.properties p
      on p.id = u.property_id
     and p.organization_id = l.organization_id
    join public.owners o
      on o.id = p.owner_id
     and o.organization_id = l.organization_id
    where l.id = p_lease_id
      and (
        (
          om.role = 'OWNER'::public.organization_role
          and o.auth_user_id = auth.uid()
        )
        or
        (
          om.role = 'TENANT'::public.organization_role
          and t.auth_user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.portal_can_read_owner(uuid) from public;
revoke all on function public.portal_can_read_property(uuid) from public;
revoke all on function public.portal_can_read_unit(uuid) from public;
revoke all on function public.portal_can_read_tenant(uuid) from public;
revoke all on function public.portal_can_read_lease(uuid) from public;

grant execute on function public.portal_can_read_owner(uuid) to authenticated;
grant execute on function public.portal_can_read_property(uuid) to authenticated;
grant execute on function public.portal_can_read_unit(uuid) to authenticated;
grant execute on function public.portal_can_read_tenant(uuid) to authenticated;
grant execute on function public.portal_can_read_lease(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Politiques SELECT portail
-- Les politiques permissives SELECT se combinent avec les politiques
-- existantes : ADMIN_AGENCY / MANAGER conservent donc leurs accès actuels.
-- ---------------------------------------------------------------------------

drop policy if exists owners_portal_select on public.owners;
create policy owners_portal_select
on public.owners
for select
to authenticated
using (
  public.portal_can_read_owner(id)
);

drop policy if exists properties_portal_select on public.properties;
create policy properties_portal_select
on public.properties
for select
to authenticated
using (
  public.portal_can_read_property(id)
);

drop policy if exists units_portal_select on public.units;
create policy units_portal_select
on public.units
for select
to authenticated
using (
  public.portal_can_read_unit(id)
);

drop policy if exists tenants_portal_select on public.tenants;
create policy tenants_portal_select
on public.tenants
for select
to authenticated
using (
  public.portal_can_read_tenant(id)
);

drop policy if exists leases_portal_select on public.leases;
create policy leases_portal_select
on public.leases
for select
to authenticated
using (
  public.portal_can_read_lease(id)
);
