
-- Liaison entre les clients Super Admin et les organisations Alteract

alter table public.alteract_platform_clients
add column if not exists organization_id uuid;

create unique index if not exists
  alteract_platform_clients_organization_id_key
on public.alteract_platform_clients (organization_id)
where organization_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'alteract_platform_clients_organization_fk'
      and conrelid = 'public.alteract_platform_clients'::regclass
  ) then
    alter table public.alteract_platform_clients
    add constraint alteract_platform_clients_organization_fk
    foreign key (organization_id)
    references public.organizations(id)
    on delete restrict;
  end if;
end;
$$;
