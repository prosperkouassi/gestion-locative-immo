SET local check_function_bodies = off;

CREATE EXTENSION "btree_gist" SCHEMA "public";

CREATE TABLE "public"."leases" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"    uuid                     NOT NULL,
  "unit_id"            uuid                     NOT NULL,
  "tenant_id"          uuid                     NOT NULL,
  "start_date"         date                     NOT NULL,
  "end_date"           date,
  "monthly_rent"       numeric(12,2)            NOT NULL,
  "currency"           text                     NOT NULL DEFAULT 'XOF'::text,
  "security_deposit"   numeric(12,2),
  "payment_due_day"    integer                  NOT NULL DEFAULT 5,
  "notes"              text,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "effective_end_date" date,
  CONSTRAINT "leases_dates_check" CHECK (((end_date IS NULL) OR (end_date >= start_date))),
  CONSTRAINT "leases_effective_end_date_check" CHECK (((effective_end_date IS NULL) OR (effective_end_date >= start_date))),
  CONSTRAINT "leases_monthly_rent_check" CHECK ((monthly_rent >= (0)::numeric)),
  CONSTRAINT "leases_organization_id_id_unique" UNIQUE (organization_id, id),
  CONSTRAINT "leases_payment_due_day_check" CHECK (((payment_due_day >= 1) AND (payment_due_day <= 28))),
  CONSTRAINT "leases_pkey" PRIMARY KEY (id),
  CONSTRAINT "leases_security_deposit_check" CHECK (((security_deposit IS NULL) OR (security_deposit >= (0)::numeric)))
);

ALTER TABLE "public"."leases"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."organization_members" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid                     NOT NULL,
  "user_id"         uuid                     NOT NULL,
  "is_active"       boolean                  NOT NULL DEFAULT true,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "organization_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "organization_members_unique" UNIQUE (organization_id, user_id)
);

ALTER TABLE "public"."organization_members"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."organizations" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "slug"       text                     NOT NULL,
  "email"      text,
  "phone"      text,
  "address"    text,
  "city"       text,
  "country"    text                     DEFAULT 'Côte d''Ivoire'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "organizations_pkey" PRIMARY KEY (id),
  CONSTRAINT "organizations_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."organizations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."owners" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid                     NOT NULL,
  "first_name"      text                     NOT NULL,
  "last_name"       text                     NOT NULL,
  "email"           text,
  "phone"           text,
  "address"         text,
  "city"            text,
  "country"         text                     DEFAULT 'Côte d''Ivoire'::text,
  "notes"           text,
  "is_active"       boolean                  NOT NULL DEFAULT true,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "owners_organization_id_id_unique" UNIQUE (organization_id, id),
  CONSTRAINT "owners_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."owners"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."payment_refunds" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid                     NOT NULL,
  "payment_id"      uuid                     NOT NULL,
  "amount"          numeric(12,2)            NOT NULL,
  "currency"        text                     NOT NULL DEFAULT 'XOF'::text,
  "refund_date"     date                     NOT NULL,
  "reason"          text,
  "reference"       text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "payment_refunds_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "payment_refunds_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."payment_refunds"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."payments" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"  uuid                     NOT NULL,
  "rent_schedule_id" uuid                     NOT NULL,
  "amount"           numeric(12,2)            NOT NULL,
  "currency"         text                     NOT NULL DEFAULT 'XOF'::text,
  "payment_date"     date                     NOT NULL,
  "reference"        text,
  "notes"            text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "payments_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "payments_organization_id_id_unique" UNIQUE (organization_id, id),
  CONSTRAINT "payments_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."payments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"         uuid                     NOT NULL,
  "first_name" text,
  "last_name"  text,
  "phone"      text,
  "avatar_url" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."properties" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid                     NOT NULL,
  "owner_id"        uuid,
  "name"            text                     NOT NULL,
  "property_type"   text                     NOT NULL,
  "address"         text,
  "city"            text,
  "country"         text                     DEFAULT 'Côte d''Ivoire'::text,
  "description"     text,
  "is_active"       boolean                  NOT NULL DEFAULT true,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "properties_organization_id_id_unique" UNIQUE (organization_id, id),
  CONSTRAINT "properties_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."properties"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."quittance_counters" (
  "organization_id" uuid                     NOT NULL,
  "year"            integer                  NOT NULL,
  "last_number"     bigint                   NOT NULL DEFAULT 0,
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "quittance_counters_last_number_check" CHECK ((last_number >= 0)),
  CONSTRAINT "quittance_counters_pkey" PRIMARY KEY (organization_id, year),
  CONSTRAINT "quittance_counters_year_check" CHECK ((year >= 2000))
);

ALTER TABLE "public"."quittance_counters"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."receipt_counters" (
  "organization_id" uuid                     NOT NULL,
  "year"            integer                  NOT NULL,
  "last_number"     bigint                   NOT NULL DEFAULT 0,
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "receipt_counters_last_number_check" CHECK ((last_number >= 0)),
  CONSTRAINT "receipt_counters_pkey" PRIMARY KEY (organization_id, year),
  CONSTRAINT "receipt_counters_year_check" CHECK ((year >= 2000))
);

ALTER TABLE "public"."receipt_counters"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."receipts" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid                     NOT NULL,
  "payment_id"      uuid                     NOT NULL,
  "receipt_number"  text                     NOT NULL,
  "issued_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "amount"          numeric(12,2)            NOT NULL,
  "currency"        text                     NOT NULL DEFAULT 'XOF'::text,
  "pdf_path"        text,
  "notes"           text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "receipts_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "receipts_number_unique_per_organization" UNIQUE (organization_id, receipt_number),
  CONSTRAINT "receipts_organization_id_id_unique" UNIQUE (organization_id, id),
  CONSTRAINT "receipts_payment_unique" UNIQUE (payment_id),
  CONSTRAINT "receipts_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."receipts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."rent_quittances" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"  uuid                     NOT NULL,
  "rent_schedule_id" uuid                     NOT NULL,
  "quittance_number" text                     NOT NULL,
  "issued_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "amount_due"       numeric(12,2)            NOT NULL,
  "currency"         text                     NOT NULL DEFAULT 'XOF'::text,
  "pdf_path"         text,
  "notes"            text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rent_quittances_amount_due_check" CHECK ((amount_due > (0)::numeric)),
  CONSTRAINT "rent_quittances_number_unique_per_organization" UNIQUE (organization_id, quittance_number),
  CONSTRAINT "rent_quittances_organization_id_id_unique" UNIQUE (organization_id, id),
  CONSTRAINT "rent_quittances_pkey" PRIMARY KEY (id),
  CONSTRAINT "rent_quittances_schedule_unique" UNIQUE (rent_schedule_id)
);

ALTER TABLE "public"."rent_quittances"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."rent_schedules" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid                     NOT NULL,
  "lease_id"        uuid                     NOT NULL,
  "period_start"    date                     NOT NULL,
  "period_end"      date                     NOT NULL,
  "due_date"        date                     NOT NULL,
  "amount_due"      numeric(12,2)            NOT NULL,
  "currency"        text                     NOT NULL DEFAULT 'XOF'::text,
  "notes"           text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rent_schedules_amount_due_check" CHECK ((amount_due >= (0)::numeric)),
  CONSTRAINT "rent_schedules_lease_period_unique" UNIQUE (lease_id, period_start),
  CONSTRAINT "rent_schedules_organization_id_id_unique" UNIQUE (organization_id, id),
  CONSTRAINT "rent_schedules_period_check" CHECK ((period_end >= period_start)),
  CONSTRAINT "rent_schedules_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."rent_schedules"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tenants" (
  "id"                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"          uuid                     NOT NULL,
  "first_name"               text                     NOT NULL,
  "last_name"                text                     NOT NULL,
  "email"                    text,
  "phone"                    text,
  "address"                  text,
  "city"                     text,
  "country"                  text                     DEFAULT 'Côte d''Ivoire'::text,
  "date_of_birth"            date,
  "identity_document_type"   text,
  "identity_document_number" text,
  "emergency_contact_name"   text,
  "emergency_contact_phone"  text,
  "notes"                    text,
  "is_active"                boolean                  NOT NULL DEFAULT true,
  "created_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"               timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tenants_organization_id_id_unique" UNIQUE (organization_id, id),
  CONSTRAINT "tenants_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."tenants"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."units" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid                     NOT NULL,
  "property_id"     uuid                     NOT NULL,
  "name"            text                     NOT NULL,
  "unit_type"       text                     NOT NULL,
  "floor"           text,
  "bedrooms"        integer,
  "bathrooms"       integer,
  "surface_area"    numeric(10,2),
  "monthly_rent"    numeric(12,2),
  "currency"        text                     NOT NULL DEFAULT 'XOF'::text,
  "description"     text,
  "is_active"       boolean                  NOT NULL DEFAULT true,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "units_bathrooms_check" CHECK (((bathrooms IS NULL) OR (bathrooms >= 0))),
  CONSTRAINT "units_bedrooms_check" CHECK (((bedrooms IS NULL) OR (bedrooms >= 0))),
  CONSTRAINT "units_monthly_rent_check" CHECK (((monthly_rent IS NULL) OR (monthly_rent >= (0)::numeric))),
  CONSTRAINT "units_organization_id_id_unique" UNIQUE (organization_id, id),
  CONSTRAINT "units_pkey" PRIMARY KEY (id),
  CONSTRAINT "units_surface_area_check" CHECK (((surface_area IS NULL) OR (surface_area >= (0)::numeric)))
);

ALTER TABLE "public"."units"
  ENABLE ROW LEVEL SECURITY;

CREATE TYPE "public"."lease_status" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'ENDED',
  'TERMINATED',
  'CANCELLED'
);

ALTER TABLE "public"."leases"
  ADD COLUMN "status" public.lease_status NOT NULL DEFAULT 'DRAFT'::public.lease_status;

CREATE TYPE "public"."organization_role" AS ENUM (
  'ADMIN_AGENCY',
  'MANAGER',
  'OWNER',
  'TENANT'
);

ALTER TABLE "public"."organization_members"
  ADD COLUMN "role" public.organization_role NOT NULL;

CREATE TYPE "public"."organization_status" AS ENUM (
  'ACTIVE',
  'SUSPENDED',
  'ARCHIVED'
);

ALTER TABLE "public"."organizations"
  ADD COLUMN "status" public.organization_status NOT NULL DEFAULT 'ACTIVE'::public.organization_status;

CREATE TYPE "public"."payment_method" AS ENUM (
  'CASH',
  'BANK_TRANSFER',
  'MOBILE_MONEY',
  'CARD',
  'CHEQUE',
  'OTHER'
);

ALTER TABLE "public"."payments"
  ADD COLUMN "payment_method" public.payment_method NOT NULL;

CREATE TYPE "public"."payment_status" AS ENUM (
  'PENDING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED'
);

ALTER TABLE "public"."payments"
  ADD COLUMN "status" public.payment_status NOT NULL DEFAULT 'COMPLETED'::public.payment_status;

CREATE TYPE "public"."rent_schedule_status" AS ENUM (
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED'
);

ALTER TABLE "public"."rent_schedules"
  ADD COLUMN "status" public.rent_schedule_status NOT NULL DEFAULT 'PENDING'::public.rent_schedule_status;

CREATE OR REPLACE FUNCTION public.create_active_lease_with_schedules (
  target_organization_id  uuid,
  target_unit_id          uuid,
  target_tenant_id        uuid,
  target_start_date       date,
  target_end_date         date,
  target_monthly_rent     numeric,
  target_currency         text    DEFAULT 'XOF'::text,
  target_security_deposit numeric DEFAULT 0,
  target_payment_due_day  integer DEFAULT 5,
  target_notes            text    DEFAULT NULL::text
)
  RETURNS public.leases
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  created_lease public.leases%rowtype;
  generated_schedule_count integer;
begin
  if target_organization_id is null then
    raise exception 'organization_id est obligatoire';
  end if;

  if target_unit_id is null then
    raise exception 'unit_id est obligatoire';
  end if;

  if target_tenant_id is null then
    raise exception 'tenant_id est obligatoire';
  end if;

  if target_start_date is null then
    raise exception 'date de début obligatoire';
  end if;

  if target_end_date is null then
    raise exception
      'date de fin obligatoire pour un bail avec échéancier automatique';
  end if;

  if target_end_date < target_start_date then
    raise exception
      'la date de fin du bail est antérieure à la date de début';
  end if;

  if target_monthly_rent is null
    or target_monthly_rent <= 0
  then
    raise exception 'loyer mensuel invalide';
  end if;

  if target_currency is null
    or btrim(target_currency) = ''
  then
    raise exception 'devise obligatoire';
  end if;

  if target_security_deposit is not null
    and target_security_deposit < 0
  then
    raise exception 'dépôt de garantie invalide';
  end if;

  if target_payment_due_day is null
    or target_payment_due_day < 1
    or target_payment_due_day > 31
  then
    raise exception 'jour d''échéance invalide';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  ) then
    raise exception 'accès refusé';
  end if;

  if not exists (
    select 1
    from public.units u
    where u.organization_id = target_organization_id
      and u.id = target_unit_id
      and u.is_active = true
  ) then
    raise exception
      'unité introuvable ou inactive dans cette organisation';
  end if;

  if not exists (
    select 1
    from public.tenants t
    where t.organization_id = target_organization_id
      and t.id = target_tenant_id
      and t.is_active = true
  ) then
    raise exception
      'locataire introuvable ou inactif dans cette organisation';
  end if;

  insert into public.leases (
    organization_id,
    unit_id,
    tenant_id,
    status,
    start_date,
    end_date,
    monthly_rent,
    currency,
    security_deposit,
    payment_due_day,
    notes
  )
  values (
    target_organization_id,
    target_unit_id,
    target_tenant_id,
    'ACTIVE'::public.lease_status,
    target_start_date,
    target_end_date,
    target_monthly_rent,
    target_currency,
    coalesce(target_security_deposit, 0),
    target_payment_due_day,
    target_notes
  )
  returning *
  into created_lease;

  generated_schedule_count :=
    public.generate_rent_schedules_for_lease(
      created_lease.id
    );

  if generated_schedule_count <= 0 then
    raise exception
      'aucune échéance générée pour le bail';
  end if;

  return created_lease;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_payment (
  target_rent_schedule_id uuid,
  target_amount           numeric,
  target_payment_date     date,
  target_payment_method   public.payment_method,
  target_status           public.payment_status DEFAULT 'COMPLETED'::public.payment_status,
  target_reference        text                  DEFAULT NULL::text,
  target_notes            text                  DEFAULT NULL::text
)
  RETURNS public.payments
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  schedule_record public.rent_schedules%rowtype;
  created_payment public.payments%rowtype;
begin
  if target_rent_schedule_id is null then
    raise exception 'rent_schedule_id est obligatoire';
  end if;

  if target_amount is null
    or target_amount <= 0
  then
    raise exception 'montant de paiement invalide';
  end if;

  if target_payment_date is null then
    raise exception 'date de paiement obligatoire';
  end if;

  if target_payment_method is null then
    raise exception 'mode de paiement obligatoire';
  end if;

  if target_status not in (
    'PENDING'::public.payment_status,
    'COMPLETED'::public.payment_status
  ) then
    raise exception
      'statut initial de paiement interdit : %',
      target_status;
  end if;

  select *
  into schedule_record
  from public.rent_schedules
  where id = target_rent_schedule_id
  for update;

  if not found then
    raise exception 'échéance introuvable';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = schedule_record.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
      and om.role in (
        'ADMIN_AGENCY',
        'MANAGER'
      )
  ) then
    raise exception 'accès refusé';
  end if;

  if schedule_record.status =
    'CANCELLED'::public.rent_schedule_status
  then
    raise exception
      'paiement interdit : échéance annulée';
  end if;

  insert into public.payments (
    organization_id,
    rent_schedule_id,
    amount,
    currency,
    payment_date,
    payment_method,
    status,
    reference,
    notes
  )
  values (
    schedule_record.organization_id,
    schedule_record.id,
    target_amount,
    schedule_record.currency,
    target_payment_date,
    target_payment_method,
    target_status,
    target_reference,
    target_notes
  )
  returning *
  into created_payment;

  return created_payment;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_payment_refund (
  target_payment_id  uuid,
  target_amount      numeric,
  target_refund_date date,
  target_reason      text    DEFAULT NULL::text,
  target_reference   text    DEFAULT NULL::text
)
  RETURNS public.payment_refunds
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  payment_record public.payments%rowtype;
  created_refund public.payment_refunds%rowtype;
  total_refunded numeric(12, 2);
begin
  if target_payment_id is null then
    raise exception 'payment_id est obligatoire';
  end if;

  if target_amount is null
    or target_amount <= 0
  then
    raise exception 'montant de remboursement invalide';
  end if;

  if target_refund_date is null then
    raise exception 'date de remboursement obligatoire';
  end if;

  select *
  into payment_record
  from public.payments
  where id = target_payment_id
  for update;

  if not found then
    raise exception 'paiement introuvable';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = payment_record.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  ) then
    raise exception 'accès refusé';
  end if;

  if payment_record.status
    <> 'COMPLETED'::public.payment_status
  then
    raise exception
      'remboursement interdit : paiement non complété';
  end if;

  select coalesce(sum(pr.amount), 0)
  into total_refunded
  from public.payment_refunds pr
  where pr.payment_id = payment_record.id
    and pr.organization_id =
      payment_record.organization_id;

  if total_refunded + target_amount
    > payment_record.amount
  then
    raise exception
      'sur-remboursement interdit : paiement %, déjà remboursé %, nouveau remboursement %',
      payment_record.amount,
      total_refunded,
      target_amount;
  end if;

  insert into public.payment_refunds (
    organization_id,
    payment_id,
    amount,
    currency,
    refund_date,
    reason,
    reference
  )
  values (
    payment_record.organization_id,
    payment_record.id,
    target_amount,
    payment_record.currency,
    target_refund_date,
    target_reason,
    target_reference
  )
  returning *
  into created_refund;

  return created_refund;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_quittance_for_schedule (
  target_schedule_id uuid
)
  RETURNS public.rent_quittances
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  schedule_record public.rent_schedules%rowtype;
  existing_quittance public.rent_quittances%rowtype;
  created_quittance public.rent_quittances%rowtype;

  total_net_paid numeric(12, 2);
  generated_quittance_number text;
  quittance_year integer;
begin
  if target_schedule_id is null then
    raise exception 'rent_schedule_id est obligatoire';
  end if;

  select *
  into schedule_record
  from public.rent_schedules
  where id = target_schedule_id
  for update;

  if not found then
    raise exception 'échéance introuvable';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = schedule_record.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  ) then
    raise exception 'accès refusé';
  end if;

  select *
  into existing_quittance
  from public.rent_quittances
  where rent_schedule_id = schedule_record.id;

  if found then
    return existing_quittance;
  end if;

  select
    coalesce(
      sum(
        p.amount
        - coalesce(refunds.refunded_amount, 0)
      ),
      0
    )
  into total_net_paid
  from public.payments p
  left join lateral (
    select
      coalesce(sum(pr.amount), 0) as refunded_amount
    from public.payment_refunds pr
    where pr.payment_id = p.id
      and pr.organization_id = p.organization_id
  ) refunds
    on true
  where p.rent_schedule_id = schedule_record.id
    and p.status = 'COMPLETED'::public.payment_status;

  if total_net_paid < schedule_record.amount_due then
    raise exception
      'quittance interdite : échéance non soldée, dû %, encaissé net %',
      schedule_record.amount_due,
      total_net_paid;
  end if;

  quittance_year :=
    extract(
      year from schedule_record.period_end
    )::integer;

  generated_quittance_number :=
    public.next_quittance_number(
      schedule_record.organization_id,
      quittance_year
    );

  insert into public.rent_quittances (
    organization_id,
    rent_schedule_id,
    quittance_number,
    amount_due,
    currency
  )
  values (
    schedule_record.organization_id,
    schedule_record.id,
    generated_quittance_number,
    schedule_record.amount_due,
    schedule_record.currency
  )
  returning *
  into created_quittance;

  return created_quittance;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_receipt_for_payment (
  target_payment_id uuid
)
  RETURNS public.receipts
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  payment_record public.payments%rowtype;
  existing_receipt public.receipts%rowtype;
  created_receipt public.receipts%rowtype;
  generated_receipt_number text;
  receipt_year integer;
begin
  if target_payment_id is null then
    raise exception 'payment_id est obligatoire';
  end if;

  -- Verrouille le paiement pendant toute la création du reçu.
  -- Deux appels concurrents pour le même paiement seront ainsi sérialisés.
  select *
  into payment_record
  from public.payments
  where id = target_payment_id
  for update;

  if not found then
    raise exception 'paiement introuvable';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = payment_record.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  ) then
    raise exception 'accès refusé';
  end if;

  if payment_record.status <> 'COMPLETED' then
    raise exception
      'un reçu ne peut être créé que pour un paiement COMPLETED';
  end if;

  -- Après obtention du verrou, on vérifie si le reçu existe déjà.
  select *
  into existing_receipt
  from public.receipts
  where payment_id = payment_record.id;

  if found then
    return existing_receipt;
  end if;

  receipt_year :=
    extract(year from payment_record.payment_date)::integer;

  generated_receipt_number :=
    public.next_receipt_number(
      payment_record.organization_id,
      receipt_year
    );

  insert into public.receipts (
    organization_id,
    payment_id,
    receipt_number,
    amount,
    currency
  )
  values (
    payment_record.organization_id,
    payment_record.id,
    generated_receipt_number,
    payment_record.amount,
    payment_record.currency
  )
  returning *
  into created_receipt;

  return created_receipt;
end;
$function$;

CREATE OR REPLACE FUNCTION public.extend_open_lease_schedules (
  target_lease_id       uuid,
  target_reference_date date DEFAULT CURRENT_DATE
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  lease_record public.leases%rowtype;

  generation_end_date date;
  current_month_start date;
  current_period_start date;
  current_period_end date;
  contractual_due_date date;
  current_due_date date;
  last_day_of_month date;

  days_in_month integer;
  occupied_days integer;
  current_amount_due numeric(12, 2);

  inserted_count integer := 0;
  affected_count integer;
begin
  if target_lease_id is null then
    raise exception 'lease_id est obligatoire';
  end if;

  if target_reference_date is null then
    raise exception 'date de référence obligatoire';
  end if;

  select *
  into lease_record
  from public.leases
  where id = target_lease_id;

  if not found then
    raise exception 'bail introuvable';
  end if;

  if lease_record.status <> 'ACTIVE'::public.lease_status then
    return 0;
  end if;

  if lease_record.end_date is not null then
    return 0;
  end if;

  generation_end_date :=
    (
      date_trunc(
        'month',
        target_reference_date
      )::date
      + interval '12 months'
      - interval '1 day'
    )::date;

  if generation_end_date < lease_record.start_date then
    return 0;
  end if;

  current_month_start :=
    date_trunc(
      'month',
      lease_record.start_date
    )::date;

  while current_month_start <= generation_end_date loop

    last_day_of_month :=
      (
        current_month_start
        + interval '1 month'
        - interval '1 day'
      )::date;

    current_period_start :=
      greatest(
        current_month_start,
        lease_record.start_date
      );

    current_period_end :=
      least(
        last_day_of_month,
        generation_end_date
      );

    contractual_due_date :=
      current_month_start
      + (
          least(
            lease_record.payment_due_day,
            extract(
              day from last_day_of_month
            )::integer
          ) - 1
        );

    current_due_date :=
      greatest(
        contractual_due_date,
        current_period_start
      );

    days_in_month :=
      extract(
        day from last_day_of_month
      )::integer;

    occupied_days :=
      current_period_end
      - current_period_start
      + 1;

    if current_period_start = current_month_start
      and current_period_end = last_day_of_month
    then
      current_amount_due :=
        lease_record.monthly_rent;
    else
      current_amount_due :=
        round(
          lease_record.monthly_rent
          * occupied_days
          / days_in_month,
          0
        );
    end if;

    insert into public.rent_schedules (
      organization_id,
      lease_id,
      period_start,
      period_end,
      due_date,
      amount_due,
      currency,
      status,
      notes
    )
    values (
      lease_record.organization_id,
      lease_record.id,
      current_period_start,
      current_period_end,
      current_due_date,
      current_amount_due,
      lease_record.currency,
      case
        when current_due_date < current_date
          then 'OVERDUE'::public.rent_schedule_status
        else 'PENDING'::public.rent_schedule_status
      end,
      null
    )
    on conflict (lease_id, period_start)
    do nothing;

    get diagnostics affected_count = row_count;

    inserted_count :=
      inserted_count + affected_count;

    current_month_start :=
      (
        current_month_start
        + interval '1 month'
      )::date;
  end loop;

  return inserted_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_rent_schedules_for_lease (
  target_lease_id uuid
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  lease_record public.leases%rowtype;

  generation_end_date date;

  current_month_start date;
  current_period_start date;
  current_period_end date;
  contractual_due_date date;
  current_due_date date;
  last_day_of_month date;

  days_in_month integer;
  occupied_days integer;
  current_amount_due numeric(12, 2);

  inserted_count integer := 0;
  affected_count integer;
begin
  if target_lease_id is null then
    raise exception 'lease_id est obligatoire';
  end if;

  select *
  into lease_record
  from public.leases
  where id = target_lease_id;

  if not found then
    raise exception 'bail introuvable';
  end if;

  if lease_record.start_date is null then
    raise exception 'date de début du bail obligatoire';
  end if;

  if lease_record.end_date is not null
    and lease_record.end_date < lease_record.start_date
  then
    raise exception
      'la date de fin du bail est antérieure à la date de début';
  end if;

  if lease_record.monthly_rent is null
    or lease_record.monthly_rent <= 0
  then
    raise exception 'loyer mensuel invalide';
  end if;

  if lease_record.payment_due_day is null
    or lease_record.payment_due_day < 1
    or lease_record.payment_due_day > 31
  then
    raise exception 'jour d''échéance invalide';
  end if;

  if lease_record.end_date is null then
    generation_end_date :=
      (
        date_trunc(
          'month',
          lease_record.start_date
        )::date
        + interval '12 months'
        - interval '1 day'
      )::date;
  else
    generation_end_date :=
      lease_record.end_date;
  end if;

  current_month_start :=
    date_trunc(
      'month',
      lease_record.start_date
    )::date;

  while current_month_start <= generation_end_date loop

    last_day_of_month :=
      (
        current_month_start
        + interval '1 month'
        - interval '1 day'
      )::date;

    current_period_start :=
      greatest(
        current_month_start,
        lease_record.start_date
      );

    current_period_end :=
      least(
        last_day_of_month,
        generation_end_date
      );

    contractual_due_date :=
      current_month_start
      + (
          least(
            lease_record.payment_due_day,
            extract(
              day from last_day_of_month
            )::integer
          ) - 1
        );

    current_due_date :=
      greatest(
        contractual_due_date,
        current_period_start
      );

    days_in_month :=
      extract(
        day from last_day_of_month
      )::integer;

    occupied_days :=
      current_period_end
      - current_period_start
      + 1;

    if current_period_start = current_month_start
      and current_period_end = last_day_of_month
    then
      current_amount_due :=
        lease_record.monthly_rent;
    else
      current_amount_due :=
        round(
          lease_record.monthly_rent
          * occupied_days
          / days_in_month,
          0
        );
    end if;

    insert into public.rent_schedules (
      organization_id,
      lease_id,
      period_start,
      period_end,
      due_date,
      amount_due,
      currency,
      status,
      notes
    )
    values (
      lease_record.organization_id,
      lease_record.id,
      current_period_start,
      current_period_end,
      current_due_date,
      current_amount_due,
      lease_record.currency,
      case
        when current_due_date < current_date
          then 'OVERDUE'::public.rent_schedule_status
        else 'PENDING'::public.rent_schedule_status
      end,
      null
    )
    on conflict (lease_id, period_start)
    do nothing;

    get diagnostics affected_count = row_count;

    inserted_count :=
      inserted_count + affected_count;

    current_month_start :=
      (
        current_month_start
        + interval '1 month'
      )::date;
  end loop;

  return inserted_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_payment_schedule_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  -- INSERT / UPDATE :
  -- recalculer l'échéance actuellement liée au paiement.

  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    perform public.refresh_rent_schedule_status(
      new.rent_schedule_id
    );
  end if;

  -- UPDATE :
  -- si le paiement a été déplacé vers une autre échéance,
  -- recalculer également l'ancienne.

  if tg_op = 'UPDATE'
    and old.rent_schedule_id is distinct from new.rent_schedule_id
  then
    perform public.refresh_rent_schedule_status(
      old.rent_schedule_id
    );
  end if;

  -- DELETE :
  -- recalculer l'échéance dont le paiement vient d'être supprimé.

  if tg_op = 'DELETE' then
    perform public.refresh_rent_schedule_status(
      old.rent_schedule_id
    );

    return old;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_refund_payment_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_payment_refund_status(
      old.payment_id
    );

    return old;
  end if;

  perform public.refresh_payment_refund_status(
    new.payment_id
  );

  if tg_op = 'UPDATE'
    and old.payment_id is distinct from new.payment_id
  then
    perform public.refresh_payment_refund_status(
      old.payment_id
    );
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_refund_schedule_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  target_schedule_id uuid;
begin
  select p.rent_schedule_id
  into target_schedule_id
  from public.payments p
  where p.id =
    case
      when tg_op = 'DELETE' then old.payment_id
      else new.payment_id
    end;

  if target_schedule_id is not null then
    perform public.refresh_rent_schedule_status(
      target_schedule_id
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.next_quittance_number (
  target_organization_id uuid,
  target_year            integer
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  next_number bigint;
begin
  if target_organization_id is null then
    raise exception 'organization_id est obligatoire';
  end if;

  if target_year is null
    or target_year < 2000
  then
    raise exception 'année invalide';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  ) then
    raise exception 'accès refusé';
  end if;

  insert into public.quittance_counters (
    organization_id,
    year,
    last_number,
    updated_at
  )
  values (
    target_organization_id,
    target_year,
    1,
    now()
  )
  on conflict (
    organization_id,
    year
  )
  do update
  set
    last_number =
      public.quittance_counters.last_number + 1,
    updated_at = now()
  returning last_number
  into next_number;

  return
    'QUI-'
    || target_year::text
    || '-'
    || lpad(
      next_number::text,
      6,
      '0'
    );
end;
$function$;

CREATE OR REPLACE FUNCTION public.next_receipt_number (
  target_organization_id uuid,
  target_year            integer
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  next_number bigint;
begin
  -- ----------------------------------------------------------
  -- Vérifications des paramètres
  -- ----------------------------------------------------------

  if target_organization_id is null then
    raise exception 'organization_id est obligatoire';
  end if;

  if target_year is null or target_year < 2000 then
    raise exception 'année invalide';
  end if;

  -- ----------------------------------------------------------
  -- Vérification de sécurité
  --
  -- L'utilisateur doit être ADMIN_AGENCY ou MANAGER
  -- actif de l'organisation demandée.
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  ) then
    raise exception 'accès refusé';
  end if;

  -- ----------------------------------------------------------
  -- Incrément atomique du compteur
  -- ----------------------------------------------------------

  insert into public.receipt_counters (
    organization_id,
    year,
    last_number,
    updated_at
  )
  values (
    target_organization_id,
    target_year,
    1,
    now()
  )

  on conflict (organization_id, year)
  do update
  set
    last_number =
      public.receipt_counters.last_number + 1,
    updated_at = now()

  returning last_number
  into next_number;

  -- ----------------------------------------------------------
  -- Exemple : REC-2026-000001
  -- ----------------------------------------------------------

  return
    'REC-'
    || target_year::text
    || '-'
    || lpad(next_number::text, 6, '0');
end;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_finalized_payment_changes()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
begin
  if old.status in (
    'COMPLETED'::public.payment_status,
    'REFUNDED'::public.payment_status,
    'CANCELLED'::public.payment_status
  ) then

    if new.organization_id is distinct from old.organization_id
      or new.rent_schedule_id is distinct from old.rent_schedule_id
      or new.amount is distinct from old.amount
      or new.currency is distinct from old.currency
      or new.payment_date is distinct from old.payment_date
      or new.payment_method is distinct from old.payment_method
      or new.reference is distinct from old.reference
      or new.notes is distinct from old.notes
    then
      raise exception
        'paiement finalisé : les données comptables ne peuvent plus être modifiées';
    end if;

  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_finalized_payment_delete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$

begin

  if old.status in (

    'COMPLETED'::public.payment_status,

    'REFUNDED'::public.payment_status,

    'CANCELLED'::public.payment_status

  ) then

    raise exception

      'paiement finalisé : suppression interdite';

  end if;



  return old;

end;

$function$;

CREATE OR REPLACE FUNCTION public.prevent_payment_overrefund()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
declare
  payment_amount numeric(12, 2);
  payment_currency text;
  payment_status public.payment_status;
  already_refunded numeric(12, 2);
begin
  select
    p.amount,
    p.currency,
    p.status
  into
    payment_amount,
    payment_currency,
    payment_status
  from public.payments p
  where p.id = new.payment_id
    and p.organization_id = new.organization_id
  for update;

  if not found then
    raise exception 'paiement introuvable';
  end if;

  if payment_status <> 'COMPLETED'::public.payment_status then
    raise exception
      'remboursement interdit : le paiement doit être COMPLETED';
  end if;

  if new.currency <> payment_currency then
    raise exception
      'devise du remboursement différente de celle du paiement';
  end if;

  select coalesce(sum(pr.amount), 0)
  into already_refunded
  from public.payment_refunds pr
  where pr.payment_id = new.payment_id
    and pr.organization_id = new.organization_id
    and (
      tg_op = 'INSERT'
      or pr.id <> new.id
    );

  if already_refunded + new.amount > payment_amount then
    raise exception
      'sur-remboursement interdit : paiement %, déjà remboursé %, nouveau remboursement %',
      payment_amount,
      already_refunded,
      new.amount;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_payment_refund_changes()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
begin
  raise exception
    'remboursement immuable : modification ou suppression interdite';
end;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_rent_schedule_overpayment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
declare
  schedule_amount numeric(12, 2);
  schedule_status public.rent_schedule_status;
  already_net_paid numeric(12, 2);
begin
  if new.status <> 'COMPLETED'::public.payment_status then
    return new;
  end if;

  select
    rs.amount_due,
    rs.status
  into
    schedule_amount,
    schedule_status
  from public.rent_schedules rs
  where rs.id = new.rent_schedule_id
    and rs.organization_id = new.organization_id
  for update;

  if not found then
    raise exception 'échéance introuvable';
  end if;

  if schedule_status = 'CANCELLED'::public.rent_schedule_status then
    raise exception
      'paiement interdit : échéance annulée';
  end if;

  select
    coalesce(
      sum(
        p.amount
        - coalesce(refunds.refunded_amount, 0)
      ),
      0
    )
  into already_net_paid
  from public.payments p
  left join lateral (
    select
      coalesce(sum(pr.amount), 0) as refunded_amount
    from public.payment_refunds pr
    where pr.payment_id = p.id
      and pr.organization_id = p.organization_id
  ) refunds
    on true
  where p.rent_schedule_id = new.rent_schedule_id
    and p.organization_id = new.organization_id
    and p.status = 'COMPLETED'::public.payment_status
    and (
      tg_op = 'INSERT'
      or p.id <> new.id
    );

  if already_net_paid + new.amount > schedule_amount then
    raise exception
      'surpaiement interdit : montant dû %, déjà encaissé net %, nouveau paiement %',
      schedule_amount,
      already_net_paid,
      new.amount;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_overdue_rent_schedules()
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  updated_count integer;
begin
  update public.rent_schedules rs
  set
    status = 'OVERDUE',
    updated_at = now()
  where rs.status = 'PENDING'
    and rs.due_date < current_date
    and not exists (
      select 1
      from public.payments p
      where p.rent_schedule_id = rs.id
        and p.status = 'COMPLETED'
    );

  get diagnostics updated_count = row_count;

  return updated_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_payment_refund_status (
  target_payment_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  payment_amount numeric(12, 2);
  current_payment_status public.payment_status;
  total_refunded numeric(12, 2);
  new_payment_status public.payment_status;
begin
  select
    amount,
    status
  into
    payment_amount,
    current_payment_status
  from public.payments
  where id = target_payment_id;

  if not found then
    return;
  end if;

  if current_payment_status not in (
    'COMPLETED'::public.payment_status,
    'REFUNDED'::public.payment_status
  ) then
    return;
  end if;

  select coalesce(sum(pr.amount), 0)
  into total_refunded
  from public.payment_refunds pr
  where pr.payment_id = target_payment_id;

  if total_refunded >= payment_amount then
    new_payment_status :=
      'REFUNDED'::public.payment_status;
  else
    new_payment_status :=
      'COMPLETED'::public.payment_status;
  end if;

  update public.payments
  set
    status = new_payment_status,
    updated_at = now()
  where id = target_payment_id
    and status is distinct from new_payment_status;
end;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_rent_schedule_status (
  target_schedule_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  schedule_amount numeric(12, 2);
  schedule_due_date date;
  current_status public.rent_schedule_status;
  total_net_paid numeric(12, 2);
  new_status public.rent_schedule_status;
begin
  select
    amount_due,
    due_date,
    status
  into
    schedule_amount,
    schedule_due_date,
    current_status
  from public.rent_schedules
  where id = target_schedule_id;

  if not found then
    return;
  end if;

  if current_status = 'CANCELLED' then
    return;
  end if;

  select
    coalesce(
      sum(
        p.amount
        - coalesce(refunds.refunded_amount, 0)
      ),
      0
    )
  into total_net_paid
  from public.payments p
  left join lateral (
    select
      coalesce(sum(pr.amount), 0) as refunded_amount
    from public.payment_refunds pr
    where pr.payment_id = p.id
      and pr.organization_id = p.organization_id
  ) refunds
    on true
  where p.rent_schedule_id = target_schedule_id
    and p.status = 'COMPLETED';

  if total_net_paid >= schedule_amount then
    new_status := 'PAID';
  elsif total_net_paid > 0 then
    new_status := 'PARTIALLY_PAID';
  elsif schedule_due_date < current_date then
    new_status := 'OVERDUE';
  else
    new_status := 'PENDING';
  end if;

  update public.rent_schedules
  set
    status = new_status,
    updated_at = now()
  where id = target_schedule_id
    and status is distinct from new_status;
end;
$function$;

CREATE OR REPLACE FUNCTION public.terminate_lease_early (
  target_lease_id           uuid,
  target_effective_end_date date
)
  RETURNS public.leases
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  lease_record public.leases%rowtype;

  affected_schedule public.rent_schedules%rowtype;

  days_in_month integer;
  occupied_days integer;
  prorated_amount numeric(12, 2);
begin
  if target_lease_id is null then
    raise exception 'lease_id est obligatoire';
  end if;

  if target_effective_end_date is null then
    raise exception 'date effective de fin obligatoire';
  end if;

  select *
  into lease_record
  from public.leases
  where id = target_lease_id
  for update;

  if not found then
    raise exception 'bail introuvable';
  end if;

  if lease_record.status <> 'ACTIVE'::public.lease_status then
    raise exception
      'seul un bail ACTIVE peut être résilié';
  end if;

  if target_effective_end_date < lease_record.start_date then
    raise exception
      'la date effective de fin est antérieure au début du bail';
  end if;

  if lease_record.end_date is not null
    and target_effective_end_date > lease_record.end_date
  then
    raise exception
      'la date effective de fin dépasse la fin prévue du bail';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = lease_record.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
      and om.role in ('ADMIN_AGENCY', 'MANAGER')
  ) then
    raise exception 'accès refusé';
  end if;

  update public.leases
  set
    status = 'TERMINATED'::public.lease_status,
    effective_end_date = target_effective_end_date,
    updated_at = now()
  where id = lease_record.id
  returning *
  into lease_record;

  select *
  into affected_schedule
  from public.rent_schedules rs
  where rs.lease_id = lease_record.id
    and target_effective_end_date
        between rs.period_start and rs.period_end
  limit 1;

  if found
    and affected_schedule.status not in (
      'PAID'::public.rent_schedule_status,
      'PARTIALLY_PAID'::public.rent_schedule_status,
      'CANCELLED'::public.rent_schedule_status
    )
  then
    days_in_month :=
      extract(
        day from (
          date_trunc(
            'month',
            affected_schedule.period_start
          )
          + interval '1 month'
          - interval '1 day'
        )
      )::integer;

    occupied_days :=
      target_effective_end_date
      - affected_schedule.period_start
      + 1;

    prorated_amount :=
      round(
        lease_record.monthly_rent
        * occupied_days
        / days_in_month,
        0
      );

    update public.rent_schedules
    set
      period_end = target_effective_end_date,
      amount_due = prorated_amount,
      updated_at = now()
    where id = affected_schedule.id;
  end if;

  update public.rent_schedules
  set
    status = 'CANCELLED'::public.rent_schedule_status,
    updated_at = now()
  where lease_id = lease_record.id
    and period_start > target_effective_end_date
    and status in (
      'PENDING'::public.rent_schedule_status,
      'OVERDUE'::public.rent_schedule_status
    );

  return lease_record;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_lease_status_transition()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
begin
  -- À la création, tous les statuts définis par l'enum restent autorisés.
  if tg_op = 'INSERT' then
    return new;
  end if;

  -- Aucun changement de statut : on laisse passer.
  if old.status = new.status then
    return new;
  end if;

  -- DRAFT peut devenir ACTIVE ou CANCELLED.
  if old.status = 'DRAFT'::public.lease_status
    and new.status in (
      'ACTIVE'::public.lease_status,
      'CANCELLED'::public.lease_status
    )
  then
    return new;
  end if;

  -- ACTIVE peut se terminer normalement ou être rompu.
  if old.status = 'ACTIVE'::public.lease_status
    and new.status in (
      'ENDED'::public.lease_status,
      'TERMINATED'::public.lease_status
    )
  then
    return new;
  end if;

  raise exception
    'transition de statut de bail interdite : % -> %',
    old.status,
    new.status;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_payment_status_transition()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
declare
  total_refunded numeric(12, 2);
begin
  -- À la création, on n'autorise que les états qui ont
  -- un sens pour un nouveau paiement.
  if tg_op = 'INSERT' then
    if new.status not in (
      'PENDING'::public.payment_status,
      'COMPLETED'::public.payment_status
    ) then
      raise exception
        'statut initial de paiement interdit : %',
        new.status;
    end if;

    return new;
  end if;

  -- Aucun changement de statut.
  if old.status = new.status then
    return new;
  end if;

  -- PENDING peut être finalisé ou annulé.
  if old.status = 'PENDING'::public.payment_status
    and new.status in (
      'COMPLETED'::public.payment_status,
      'CANCELLED'::public.payment_status
    )
  then
    return new;
  end if;

  -- Calcul du total remboursé lorsque l'on travaille
  -- avec COMPLETED / REFUNDED.
  select coalesce(sum(pr.amount), 0)
  into total_refunded
  from public.payment_refunds pr
  where pr.payment_id = old.id
    and pr.organization_id = old.organization_id;

  -- COMPLETED -> REFUNDED uniquement si le paiement
  -- est réellement remboursé en totalité.
  if old.status = 'COMPLETED'::public.payment_status
    and new.status = 'REFUNDED'::public.payment_status
  then
    if total_refunded >= old.amount then
      return new;
    end if;

    raise exception
      'passage à REFUNDED interdit : paiement %, remboursé %',
      old.amount,
      total_refunded;
  end if;

  -- REFUNDED -> COMPLETED uniquement si, à la suite
  -- d'une correction contrôlée des remboursements,
  -- le total remboursé est redevenu inférieur au paiement.
  if old.status = 'REFUNDED'::public.payment_status
    and new.status = 'COMPLETED'::public.payment_status
  then
    if total_refunded < old.amount then
      return new;
    end if;

    raise exception
      'retour à COMPLETED interdit : paiement toujours totalement remboursé';
  end if;

  raise exception
    'transition de statut de paiement interdite : % -> %',
    old.status,
    new.status;
end;
$function$;

ALTER TABLE "public"."leases"
  ADD CONSTRAINT "leases_no_active_date_overlap" EXCLUDE USING gist (organization_id WITH =, unit_id WITH =, daterange(start_date, end_date, '[]'::text) WITH &&)
    WHERE ((status = 'ACTIVE'::public.lease_status));

ALTER TABLE "public"."leases"
  ADD CONSTRAINT "leases_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."organization_members"
  ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."owners"
  ADD CONSTRAINT "owners_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."payment_refunds"
  ADD CONSTRAINT "payment_refunds_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."payment_refunds"
  ADD CONSTRAINT "payment_refunds_payment_same_organization_fkey" FOREIGN KEY (organization_id, payment_id) REFERENCES public.payments(organization_id, id) ON DELETE RESTRICT;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."organization_members"
  ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."properties"
  ADD CONSTRAINT "properties_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."properties"
  ADD CONSTRAINT "properties_owner_same_organization_fkey" FOREIGN KEY (organization_id, owner_id) REFERENCES public.owners(organization_id, id) ON DELETE RESTRICT;

ALTER TABLE "public"."quittance_counters"
  ADD CONSTRAINT "quittance_counters_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."receipt_counters"
  ADD CONSTRAINT "receipt_counters_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."receipts"
  ADD CONSTRAINT "receipts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."receipts"
  ADD CONSTRAINT "receipts_payment_same_organization_fkey" FOREIGN KEY (organization_id, payment_id) REFERENCES public.payments(organization_id, id) ON DELETE RESTRICT;

ALTER TABLE "public"."rent_quittances"
  ADD CONSTRAINT "rent_quittances_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."rent_schedules"
  ADD CONSTRAINT "rent_schedules_lease_same_organization_fkey" FOREIGN KEY (organization_id, lease_id) REFERENCES public.leases(organization_id, id) ON DELETE CASCADE;

ALTER TABLE "public"."rent_schedules"
  ADD CONSTRAINT "rent_schedules_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_schedule_same_organization_fkey" FOREIGN KEY (organization_id, rent_schedule_id) REFERENCES public.rent_schedules(organization_id, id) ON DELETE RESTRICT;

ALTER TABLE "public"."rent_quittances"
  ADD CONSTRAINT "rent_quittances_schedule_same_organization_fkey" FOREIGN KEY (organization_id, rent_schedule_id) REFERENCES public.rent_schedules(organization_id, id)
    ON DELETE RESTRICT;

ALTER TABLE "public"."tenants"
  ADD CONSTRAINT "tenants_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."leases"
  ADD CONSTRAINT "leases_tenant_same_organization_fkey" FOREIGN KEY (organization_id, tenant_id) REFERENCES public.tenants(organization_id, id) ON DELETE RESTRICT;

ALTER TABLE "public"."units"
  ADD CONSTRAINT "units_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."leases"
  ADD CONSTRAINT "leases_unit_same_organization_fkey" FOREIGN KEY (organization_id, unit_id) REFERENCES public.units(organization_id, id) ON DELETE RESTRICT;

ALTER TABLE "public"."units"
  ADD CONSTRAINT "units_property_same_organization_fkey" FOREIGN KEY (organization_id, property_id) REFERENCES public.properties(organization_id, id) ON DELETE CASCADE;

CREATE INDEX leases_organization_id_idx ON public.leases USING btree (organization_id);

CREATE INDEX leases_status_idx ON public.leases USING btree (status);

CREATE INDEX leases_tenant_id_idx ON public.leases USING btree (tenant_id);

CREATE INDEX leases_unit_id_idx ON public.leases USING btree (unit_id);

CREATE INDEX organization_members_organization_id_idx ON public.organization_members USING btree (organization_id);

CREATE INDEX organization_members_user_id_idx ON public.organization_members USING btree (user_id);

CREATE INDEX owners_organization_id_idx ON public.owners USING btree (organization_id);

CREATE INDEX payment_refunds_organization_id_idx ON public.payment_refunds USING btree (organization_id);

CREATE INDEX payment_refunds_payment_id_idx ON public.payment_refunds USING btree (payment_id);

CREATE INDEX payment_refunds_refund_date_idx ON public.payment_refunds USING btree (refund_date);

CREATE INDEX payments_organization_id_idx ON public.payments USING btree (organization_id);

CREATE INDEX payments_payment_date_idx ON public.payments USING btree (payment_date);

CREATE INDEX payments_rent_schedule_id_idx ON public.payments USING btree (rent_schedule_id);

CREATE INDEX payments_status_idx ON public.payments USING btree (status);

CREATE INDEX properties_organization_id_idx ON public.properties USING btree (organization_id);

CREATE INDEX properties_owner_id_idx ON public.properties USING btree (owner_id);

CREATE INDEX receipts_issued_at_idx ON public.receipts USING btree (issued_at);

CREATE INDEX receipts_organization_id_idx ON public.receipts USING btree (organization_id);

CREATE INDEX rent_quittances_issued_at_idx ON public.rent_quittances USING btree (issued_at);

CREATE INDEX rent_quittances_organization_id_idx ON public.rent_quittances USING btree (organization_id);

CREATE INDEX rent_schedules_due_date_idx ON public.rent_schedules USING btree (due_date);

CREATE INDEX rent_schedules_lease_id_idx ON public.rent_schedules USING btree (lease_id);

CREATE INDEX rent_schedules_organization_id_idx ON public.rent_schedules USING btree (organization_id);

CREATE INDEX rent_schedules_status_idx ON public.rent_schedules USING btree (status);

CREATE INDEX tenants_organization_id_idx ON public.tenants USING btree (organization_id);

CREATE INDEX units_organization_id_idx ON public.units USING btree (organization_id);

CREATE INDEX units_property_id_idx ON public.units USING btree (property_id);

CREATE TRIGGER leases_validate_status_transition
  BEFORE UPDATE OF status ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lease_status_transition();

CREATE TRIGGER payment_refunds_prevent_delete
  BEFORE DELETE ON public.payment_refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_payment_refund_changes();

CREATE TRIGGER payment_refunds_prevent_overrefund
  BEFORE INSERT OR UPDATE ON public.payment_refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_payment_overrefund();

CREATE TRIGGER payment_refunds_prevent_update
  BEFORE UPDATE ON public.payment_refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_payment_refund_changes();

CREATE TRIGGER payment_refunds_refresh_payment_status
  AFTER INSERT OR DELETE OR UPDATE ON public.payment_refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_refund_payment_status();

CREATE TRIGGER payment_refunds_refresh_schedule_status
  AFTER INSERT OR DELETE OR UPDATE ON public.payment_refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_refund_schedule_status();

CREATE TRIGGER payments_prevent_finalized_changes
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_finalized_payment_changes();

CREATE TRIGGER payments_prevent_finalized_delete
  BEFORE DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_finalized_payment_delete();

CREATE TRIGGER payments_prevent_overpayment
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_rent_schedule_overpayment();

CREATE TRIGGER payments_refresh_schedule_status
  AFTER INSERT OR DELETE OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_schedule_status();

CREATE TRIGGER payments_validate_status_transition
  BEFORE UPDATE OF status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_status_transition();

CREATE POLICY "leases_delete_manager" ON "public"."leases"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = leases.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "leases_select_manager" ON "public"."leases"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = leases.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "leases_update_manager" ON "public"."leases"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = leases.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = leases.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "organization_members_select_own" ON "public"."organization_members"
  FOR SELECT
  TO "authenticated"
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "organizations_select_member" ON "public"."organizations"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = organizations.id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true)))));

CREATE POLICY "owners_delete_manager" ON "public"."owners"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = owners.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "owners_insert_manager" ON "public"."owners"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = owners.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "owners_select_manager" ON "public"."owners"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = owners.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "owners_update_manager" ON "public"."owners"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = owners.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = owners.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "payment_refunds_select_manager" ON "public"."payment_refunds"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = payment_refunds.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "payments_delete_manager" ON "public"."payments"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = payments.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "payments_select_manager" ON "public"."payments"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = payments.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "payments_update_manager" ON "public"."payments"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = payments.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = payments.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "profiles_select_own" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "properties_delete_manager" ON "public"."properties"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = properties.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "properties_insert_manager" ON "public"."properties"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = properties.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "properties_select_manager" ON "public"."properties"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = properties.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "properties_update_manager" ON "public"."properties"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = properties.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = properties.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "receipts_select_manager" ON "public"."receipts"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = receipts.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "rent_quittances_select_manager" ON "public"."rent_quittances"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = rent_quittances.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "rent_schedules_delete_manager" ON "public"."rent_schedules"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = rent_schedules.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "rent_schedules_select_manager" ON "public"."rent_schedules"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = rent_schedules.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "rent_schedules_update_manager" ON "public"."rent_schedules"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = rent_schedules.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = rent_schedules.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "tenants_delete_manager" ON "public"."tenants"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = tenants.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "tenants_insert_manager" ON "public"."tenants"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = tenants.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "tenants_select_manager" ON "public"."tenants"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = tenants.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "tenants_update_manager" ON "public"."tenants"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = tenants.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = tenants.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "units_delete_manager" ON "public"."units"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = units.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "units_insert_manager" ON "public"."units"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = units.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "units_select_manager" ON "public"."units"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = units.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

CREATE POLICY "units_update_manager" ON "public"."units"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = units.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE
    ((om.organization_id = units.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.is_active = true) AND (om.role = ANY
    (ARRAY['ADMIN_AGENCY'::public.organization_role, 'MANAGER'::public.organization_role]))))));

COMMENT ON EXTENSION "btree_gist" IS 'support for indexing common datatypes in GiST';

REVOKE ALL ON FUNCTION "public"."create_active_lease_with_schedules"(uuid, uuid, uuid, date, date, numeric, text, numeric, integer, text) FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION "public"."create_active_lease_with_schedules"(uuid, uuid, uuid, date, date, numeric, text, numeric, integer, text)
  TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."create_payment"(uuid, numeric, date, public.payment_method, public.payment_status, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."create_payment"(uuid, numeric, date, public.payment_method, public.payment_status, text, text) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."create_payment_refund"(uuid, numeric, date, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."create_payment_refund"(uuid, numeric, date, text, text) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."create_quittance_for_schedule"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."create_quittance_for_schedule"(uuid) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."create_receipt_for_payment"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."create_receipt_for_payment"(uuid) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."extend_open_lease_schedules"(uuid, date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."extend_open_lease_schedules"(uuid, date) TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."generate_rent_schedules_for_lease"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."generate_rent_schedules_for_lease"(uuid) TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."handle_payment_schedule_status"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."handle_payment_schedule_status"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."handle_refund_payment_status"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."handle_refund_payment_status"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."handle_refund_schedule_status"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."handle_refund_schedule_status"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."next_quittance_number"(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."next_quittance_number"(uuid, integer) TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."next_receipt_number"(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."next_receipt_number"(uuid, integer) TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."prevent_finalized_payment_changes"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."prevent_finalized_payment_changes"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."prevent_finalized_payment_delete"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."prevent_finalized_payment_delete"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."prevent_payment_overrefund"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."prevent_payment_overrefund"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."prevent_payment_refund_changes"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."prevent_payment_refund_changes"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."prevent_rent_schedule_overpayment"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."prevent_rent_schedule_overpayment"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."refresh_overdue_rent_schedules"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."refresh_overdue_rent_schedules"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."refresh_payment_refund_status"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."refresh_payment_refund_status"(uuid) TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."refresh_rent_schedule_status"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."refresh_rent_schedule_status"(uuid) TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."terminate_lease_early"(uuid, date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."terminate_lease_early"(uuid, date) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."validate_lease_status_transition"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."validate_lease_status_transition"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."validate_payment_status_transition"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."validate_payment_status_transition"() TO "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."leases" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organization_members" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organizations" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."owners" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payment_refunds" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payments" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."properties" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."quittance_counters" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."receipt_counters" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."receipts" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rent_quittances" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rent_schedules" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tenants" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."units" TO "anon", "authenticated", "postgres", "service_role";

GRANT USAGE ON TYPE "public"."lease_status" TO "postgres";

GRANT USAGE ON TYPE "public"."organization_role" TO "postgres";

GRANT USAGE ON TYPE "public"."organization_status" TO "postgres";

GRANT USAGE ON TYPE "public"."payment_method" TO "postgres";

GRANT USAGE ON TYPE "public"."payment_status" TO "postgres";

GRANT USAGE ON TYPE "public"."rent_schedule_status" TO "postgres";

