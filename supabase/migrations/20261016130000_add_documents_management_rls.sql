-- Bloc 4 — Documents
-- Bucket privé idempotent + droits de gestion ADMIN_AGENCY / MANAGER.
-- Les politiques de lecture portail déjà existantes sont conservées.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id)
do update set
  name = excluded.name,
  public = false;

alter table public.documents enable row level security;

drop policy if exists documents_admin_manager_insert
on public.documents;

drop policy if exists documents_admin_manager_update
on public.documents;

drop policy if exists documents_admin_manager_delete
on public.documents;

create policy documents_admin_manager_insert
on public.documents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = documents.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);

create policy documents_admin_manager_update
on public.documents
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = documents.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = documents.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);

create policy documents_admin_manager_delete
on public.documents
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = documents.organization_id
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);

drop policy if exists documents_storage_admin_manager_insert
on storage.objects;

drop policy if exists documents_storage_admin_manager_delete
on storage.objects;

create policy documents_storage_admin_manager_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);

create policy documents_storage_admin_manager_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  )
);
