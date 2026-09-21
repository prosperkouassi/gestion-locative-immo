-- ============================================================
-- Alteract
-- Module : Dépenses
-- Migration : add_expenses
-- ============================================================


-- ============================================================
-- ENUM : expense_category
-- ============================================================

do $$
begin
  create type public.expense_category as enum (
    'MAINTENANCE',
    'REPAIR',
    'UTILITY',
    'TAX',
    'INSURANCE',
    'MANAGEMENT',
    'SERVICE',
    'OTHER'
  );
exception
  when duplicate_object then null;
end
$$;


-- ============================================================
-- ENUM : expense_status
-- ============================================================

do $$
begin
  create type public.expense_status as enum (
    'DRAFT',
    'PENDING',
    'PAID',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end
$$;


-- ============================================================
-- TABLE : expenses
-- ============================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  property_id uuid,
  unit_id uuid,

  category public.expense_category
    not null
    default 'OTHER',

  status public.expense_status
    not null
    default 'PENDING',

  title text not null,
  description text,

  amount numeric(12,2)
    not null
    check (
      amount >= 0
    ),

  currency text
    not null
    default 'XOF',

  expense_date date
    not null
    default current_date,

  paid_at timestamptz,

  provider_name text,
  reference text,

  notes text,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint expenses_property_fk
    foreign key (
      organization_id,
      property_id
    )
    references public.properties(
      organization_id,
      id
    )
    on delete restrict,

  constraint expenses_unit_fk
    foreign key (
      organization_id,
      unit_id
    )
    references public.units(
      organization_id,
      id
    )
    on delete restrict,

  constraint expenses_target_required
    check (
      property_id is not null
      or unit_id is not null
    )
);


-- ============================================================
-- INDEX
-- ============================================================

create unique index if not exists
expenses_org_id_id_key
on public.expenses (
  organization_id,
  id
);


create index if not exists
expenses_organization_id_idx
on public.expenses (
  organization_id
);


create index if not exists
expenses_property_id_idx
on public.expenses (
  property_id
);


create index if not exists
expenses_unit_id_idx
on public.expenses (
  unit_id
);


create index if not exists
expenses_status_idx
on public.expenses (
  organization_id,
  status
);


create index if not exists
expenses_expense_date_idx
on public.expenses (
  organization_id,
  expense_date desc
);


-- ============================================================
-- RLS
-- ============================================================

alter table public.expenses
enable row level security;


-- ============================================================
-- SELECT
-- ADMIN_AGENCY / MANAGER
-- ============================================================

drop policy if exists
"expenses_select_manager"
on public.expenses;

create policy "expenses_select_manager"
on public.expenses
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id =
      expenses.organization_id

      and om.user_id = (
        select auth.uid()
      )

      and om.is_active = true

      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
);


-- ============================================================
-- INSERT
-- ADMIN_AGENCY / MANAGER
-- ============================================================

drop policy if exists
"expenses_insert_manager"
on public.expenses;

create policy "expenses_insert_manager"
on public.expenses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id =
      expenses.organization_id

      and om.user_id = (
        select auth.uid()
      )

      and om.is_active = true

      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
);


-- ============================================================
-- UPDATE
-- ADMIN_AGENCY / MANAGER
-- ============================================================

drop policy if exists
"expenses_update_manager"
on public.expenses;

create policy "expenses_update_manager"
on public.expenses
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id =
      expenses.organization_id

      and om.user_id = (
        select auth.uid()
      )

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
    where om.organization_id =
      expenses.organization_id

      and om.user_id = (
        select auth.uid()
      )

      and om.is_active = true

      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
);


-- ============================================================
-- DELETE
-- ADMIN_AGENCY / MANAGER
-- ============================================================

drop policy if exists
"expenses_delete_manager"
on public.expenses;

create policy "expenses_delete_manager"
on public.expenses
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id =
      expenses.organization_id

      and om.user_id = (
        select auth.uid()
      )

      and om.is_active = true

      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  )
);