-- Lie un compte Supabase Auth à un enregistrement métier OWNER ou TENANT.
-- Les colonnes restent nullables pour ne pas casser les données existantes.

alter table public.owners
  add column if not exists auth_user_id uuid
  references auth.users(id)
  on delete set null;

alter table public.tenants
  add column if not exists auth_user_id uuid
  references auth.users(id)
  on delete set null;

-- Un même compte Auth ne peut représenter qu'un seul propriétaire
-- dans une même organisation.
create unique index if not exists owners_organization_auth_user_uidx
  on public.owners (organization_id, auth_user_id)
  where auth_user_id is not null;

-- Un même compte Auth ne peut représenter qu'un seul locataire
-- dans une même organisation.
create unique index if not exists tenants_organization_auth_user_uidx
  on public.tenants (organization_id, auth_user_id)
  where auth_user_id is not null;

create index if not exists owners_auth_user_id_idx
  on public.owners (auth_user_id)
  where auth_user_id is not null;

create index if not exists tenants_auth_user_id_idx
  on public.tenants (auth_user_id)
  where auth_user_id is not null;

comment on column public.owners.auth_user_id is
  'Compte Supabase Auth associé à ce propriétaire pour le portail propriétaire.';

comment on column public.tenants.auth_user_id is
  'Compte Supabase Auth associé à ce locataire pour le portail locataire.';
