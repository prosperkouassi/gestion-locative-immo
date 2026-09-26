-- Supabase Storage policies for the private "documents" bucket.
--
-- Path convention:
--   <organization_id>/<document_id>/<filename>
--
-- ADMIN_AGENCY / MANAGER:
--   - upload, read, update and delete files inside their organization folder.
--
-- OWNER / TENANT:
--   - read only files whose public.documents row is visible to them.

create or replace function public.can_read_document_storage(
  target_path text
)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.documents d
    join public.organization_members om
      on om.organization_id = d.organization_id
     and om.user_id = auth.uid()
     and om.is_active = true
    where d.storage_path = target_path
      and (
        om.role in ('ADMIN_AGENCY', 'MANAGER')

        or (
          om.role = 'OWNER'
          and d.is_visible_to_owner = true
          and (
            (
              d.owner_id is not null
              and public.portal_can_read_owner(d.owner_id)
            )
            or
            (
              d.property_id is not null
              and public.portal_can_read_property(d.property_id)
            )
            or
            (
              d.unit_id is not null
              and public.portal_can_read_unit(d.unit_id)
            )
            or
            (
              d.lease_id is not null
              and public.portal_can_read_lease(d.lease_id)
            )
          )
        )

        or (
          om.role = 'TENANT'
          and d.is_visible_to_tenant = true
          and (
            (
              d.tenant_id is not null
              and public.portal_can_read_tenant(d.tenant_id)
            )
            or
            (
              d.unit_id is not null
              and public.portal_can_read_unit(d.unit_id)
            )
            or
            (
              d.lease_id is not null
              and public.portal_can_read_lease(d.lease_id)
            )
          )
        )
      )
  );
$$;

revoke all
on function public.can_read_document_storage(text)
from public;

grant execute
on function public.can_read_document_storage(text)
to authenticated;

drop policy if exists documents_storage_select
on storage.objects;

create policy documents_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and public.can_read_document_storage(name)
);

drop policy if exists documents_storage_insert_manager
on storage.objects;

create policy documents_storage_insert_manager
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
      and split_part(name, '/', 1) = om.organization_id::text
  )
);

drop policy if exists documents_storage_update_manager
on storage.objects;

create policy documents_storage_update_manager
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
      and split_part(name, '/', 1) = om.organization_id::text
  )
)
with check (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
      and split_part(name, '/', 1) = om.organization_id::text
  )
);

drop policy if exists documents_storage_delete_manager
on storage.objects;

create policy documents_storage_delete_manager
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
      and split_part(name, '/', 1) = om.organization_id::text
  )
);
