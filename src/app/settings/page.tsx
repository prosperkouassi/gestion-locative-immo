import {
  BadgeCheck,
  Bell,
  Building2,
  CreditCard,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";

import { updateOrganizationAction } from "./actions";

function formatRole(role: string | null | undefined) {
  switch (role) {
    case "ADMIN_AGENCY":
      return "Administrateur agence";
    case "MANAGER":
      return "Gestionnaire";
    case "OWNER":
      return "Propriétaire";
    case "TENANT":
      return "Locataire";
    default:
      return role || "Non renseigné";
  }
}

function formatOrganizationStatus(
  status: string | null | undefined
) {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Active",
        className:
          "bg-emerald-50 text-emerald-700 ring-emerald-100",
      };
    case "SUSPENDED":
      return {
        label: "Suspendue",
        className:
          "bg-amber-50 text-amber-700 ring-amber-100",
      };
    case "ARCHIVED":
      return {
        label: "Archivée",
        className:
          "bg-slate-100 text-slate-600 ring-slate-200",
      };
    default:
      return {
        label: status || "Non renseigné",
        className:
          "bg-slate-100 text-slate-600 ring-slate-200",
      };
  }
}

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = user
    ? await supabase
        .from("organization_members")
        .select("organization_id, role, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle()
    : { data: null };

  const { data: organization } = membership?.organization_id
    ? await supabase
        .from("organizations")
        .select(
          "id, name, slug, email, phone, address, city, country, status, created_at, updated_at"
        )
        .eq("id", membership.organization_id)
        .maybeSingle()
    : { data: null };

  const organizationStatus = formatOrganizationStatus(
    organization?.status
  );

  const agencyName =
    organization?.name ?? "Agence non renseignée";
  const agencySlug = organization?.slug ?? "—";
  const userEmail = user?.email ?? "Email non renseigné";
  const currentRole = formatRole(membership?.role);

  const canEditOrganization =
    membership?.role === "ADMIN_AGENCY";

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="flex h-screen">
        <AppSidebar />

        <main className="h-screen flex-1 overflow-y-auto">
          <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-red-500">
                Administration
              </p>

              <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#111827]">
                Paramètres
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
              >
                <Search className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </button>
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Configuration Alteract
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Gérez progressivement les informations de
                  l’agence, les accès, les documents et les règles
                  de gestion.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Organisation
                    </p>
                    <Building2 className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 truncate text-[20px] font-extrabold text-slate-900">
                    {agencyName}
                  </p>

                  <p className="mt-2 text-[12px] text-slate-400">
                    Slug : {agencySlug}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Statut agence
                    </p>
                    <BadgeCheck className="h-5 w-5 text-emerald-500" />
                  </div>

                  <div className="mt-5">
                    <span
                      className={[
                        "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                        organizationStatus.className,
                      ].join(" ")}
                    >
                      {organizationStatus.label}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Mon rôle
                    </p>
                    <ShieldCheck className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[18px] font-extrabold text-slate-900">
                    {currentRole}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Compte connecté
                    </p>
                    <UserRound className="h-5 w-5 text-slate-600" />
                  </div>

                  <p className="mt-4 truncate text-[14px] font-bold text-slate-900">
                    {userEmail}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                      <Building2 className="h-5 w-5 text-red-500" />
                    </div>

                    <div>
                      <h3 className="text-[16px] font-extrabold text-slate-900">
                        Informations de l’agence
                      </h3>

                      <p className="mt-1 text-[12px] text-slate-500">
                        Coordonnées utilisées pour votre
                        organisation et vos futurs documents.
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  action={updateOrganizationAction}
                  className="space-y-5 p-5"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-[12px] font-semibold text-slate-600">
                        Nom de l’agence *
                      </span>
                      <input
                        name="name"
                        type="text"
                        required
                        maxLength={120}
                        defaultValue={organization?.name ?? ""}
                        disabled={!canEditOrganization}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </span>
                      <input
                        name="email"
                        type="email"
                        maxLength={160}
                        defaultValue={organization?.email ?? ""}
                        disabled={!canEditOrganization}
                        placeholder="contact@agence.com"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
                        <Phone className="h-3.5 w-3.5" />
                        Téléphone
                      </span>
                      <input
                        name="phone"
                        type="tel"
                        maxLength={40}
                        defaultValue={organization?.phone ?? ""}
                        disabled={!canEditOrganization}
                        placeholder="+225 00 00 00 00 00"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
                        <MapPin className="h-3.5 w-3.5" />
                        Adresse
                      </span>
                      <input
                        name="address"
                        type="text"
                        maxLength={240}
                        defaultValue={organization?.address ?? ""}
                        disabled={!canEditOrganization}
                        placeholder="Adresse de l’agence"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-[12px] font-semibold text-slate-600">
                        Ville
                      </span>
                      <input
                        name="city"
                        type="text"
                        maxLength={120}
                        defaultValue={organization?.city ?? ""}
                        disabled={!canEditOrganization}
                        placeholder="Ville"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-[12px] font-semibold text-slate-600">
                        Pays
                      </span>
                      <input
                        name="country"
                        type="text"
                        maxLength={120}
                        defaultValue={organization?.country ?? ""}
                        disabled={!canEditOrganization}
                        placeholder="Pays"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[12px] font-semibold text-slate-600">
                        Identifiant : {agencySlug}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Le slug et le statut ne sont pas
                        modifiables depuis ce formulaire.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={!canEditOrganization}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Save className="h-4 w-4" />
                      Enregistrer
                    </button>
                  </div>

                  {!canEditOrganization ? (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                      <p className="text-[12px] font-medium text-amber-700">
                        Seul un administrateur d’agence peut
                        modifier ces informations.
                      </p>
                    </div>
                  ) : null}
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                      <Users className="h-5 w-5 text-slate-600" />
                    </div>

                    <div>
                      <h3 className="text-[16px] font-extrabold text-slate-900">
                        Utilisateurs et rôles
                      </h3>

                      <p className="mt-1 text-[12px] text-slate-500">
                        Votre accès actuel à l’organisation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-[12px] font-semibold text-slate-500">
                      Utilisateur
                    </p>
                    <p className="mt-1 truncate text-[13px] font-bold text-slate-900">
                      {userEmail}
                    </p>
                  </div>

                  <div>
                    <p className="text-[12px] font-semibold text-slate-500">
                      Rôle
                    </p>
                    <p className="mt-1 text-[13px] font-bold text-slate-900">
                      {currentRole}
                    </p>
                  </div>

                  <div>
                    <p className="text-[12px] font-semibold text-slate-500">
                      Accès
                    </p>
                    <span className="mt-2 inline-flex rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                      {membership?.is_active
                        ? "Actif"
                        : "Non actif"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[12px] leading-5 text-slate-500">
                      La gestion des invitations et des autres
                      utilisateurs sera ajoutée dans la prochaine
                      étape.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-[18px] font-extrabold text-slate-900">
                  Modules de configuration
                </h2>

                <p className="mt-1 text-[12px] text-slate-500">
                  Ces sections seront activées progressivement.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                      <SlidersHorizontal className="h-5 w-5 text-red-500" />
                    </div>

                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900">
                        Préférences générales
                      </h3>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">
                        Devise, formats, comportements et
                        préférences générales de l’agence.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                      <ReceiptText className="h-5 w-5 text-red-500" />
                    </div>

                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900">
                        Numérotation des documents
                      </h3>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">
                        Préfixes et règles des reçus, quittances
                        et futurs documents.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                      <CreditCard className="h-5 w-5 text-red-500" />
                    </div>

                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900">
                        Loyers et paiements
                      </h3>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">
                        Jours d’échéance, méthodes de paiement et
                        règles financières de l’agence.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <ShieldCheck className="h-5 w-5 text-slate-600" />
                    </div>

                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900">
                        Sécurité
                      </h3>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">
                        Sessions, permissions, contrôle des accès
                        et audit.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <KeyRound className="h-5 w-5 text-slate-600" />
                    </div>

                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900">
                        Accès et invitations
                      </h3>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">
                        Invitations d’utilisateurs et affectation
                        des rôles organisationnels.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <LockKeyhole className="h-5 w-5 text-slate-600" />
                    </div>

                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900">
                        Contrôles sensibles
                      </h3>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">
                        Actions administratives protégées et
                        opérations nécessitant une autorisation
                        renforcée.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-red-100 bg-red-50/60 p-5">
              <div className="flex items-start gap-3">
                <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />

                <div>
                  <h3 className="text-[14px] font-bold text-slate-900">
                    Paramètres V2
                  </h3>

                  <p className="mt-1 text-[12px] leading-5 text-slate-600">
                    Les informations principales de l’agence sont
                    maintenant modifiables par l’administrateur.
                    Les rôles, invitations et autres paramètres
                    seront activés progressivement.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
