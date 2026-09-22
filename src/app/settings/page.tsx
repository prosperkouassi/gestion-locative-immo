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
  UserPlus,
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

function roleBadgeClass(role: string | null | undefined) {
  switch (role) {
    case "ADMIN_AGENCY":
      return "bg-red-50 text-red-700 ring-red-100";
    case "MANAGER":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    case "OWNER":
      return "bg-violet-50 text-violet-700 ring-violet-100";
    case "TENANT":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

type MemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

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

  let members: MemberRow[] = [];
  let profilesById = new Map<string, ProfileRow>();

  if (
    membership?.organization_id &&
    membership.role === "ADMIN_AGENCY"
  ) {
    const { data: memberRows } = await supabase
      .from("organization_members")
      .select(
        "id, organization_id, user_id, role, is_active, created_at"
      )
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: true });

    members = (memberRows ?? []) as MemberRow[];

    const memberUserIds = members.map(
      (member) => member.user_id
    );

    if (memberUserIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, phone, avatar_url"
        )
        .in("id", memberUserIds);

      profilesById = new Map(
        ((profileRows ?? []) as ProfileRow[]).map(
          (profile) => [profile.id, profile]
        )
      );
    }
  } else if (user) {
    const { data: ownProfile } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, phone, avatar_url"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (ownProfile) {
      profilesById.set(
        ownProfile.id,
        ownProfile as ProfileRow
      );
    }
  }

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

  const visibleMembers =
    canEditOrganization
      ? members
      : user && membership
        ? [
            {
              id: user.id,
              organization_id: membership.organization_id,
              user_id: user.id,
              role: membership.role,
              is_active: membership.is_active,
              created_at: null,
            },
          ]
        : [];

  const activeMembersCount = visibleMembers.filter(
    (member) => member.is_active
  ).length;

  const memberCount = visibleMembers.length;

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
                      Membres actifs
                    </p>
                    <Users className="h-5 w-5 text-slate-600" />
                  </div>

                  <p className="mt-4 text-[24px] font-extrabold text-slate-900">
                    {activeMembersCount}
                  </p>

                  <p className="mt-1 text-[12px] text-slate-400">
                    sur {memberCount} membre
                    {memberCount > 1 ? "s" : ""}
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
                      <UserRound className="h-5 w-5 text-slate-600" />
                    </div>

                    <div>
                      <h3 className="text-[16px] font-extrabold text-slate-900">
                        Mon accès
                      </h3>

                      <p className="mt-1 text-[12px] text-slate-500">
                        Votre compte actuel dans l’organisation.
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
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                    <Users className="h-5 w-5 text-red-500" />
                  </div>

                  <div>
                    <h3 className="text-[16px] font-extrabold text-slate-900">
                      Utilisateurs et rôles
                    </h3>

                    <p className="mt-1 text-[12px] text-slate-500">
                      Membres rattachés à votre organisation.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled
                  title="L’invitation sera activée à la prochaine étape"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-[12px] font-bold text-slate-400"
                >
                  <UserPlus className="h-4 w-4" />
                  Inviter un utilisateur
                </button>
              </div>

              {visibleMembers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                          Utilisateur
                        </th>
                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                          Téléphone
                        </th>
                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                          Rôle
                        </th>
                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                          Statut
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleMembers.map((member) => {
                        const profile =
                          profilesById.get(member.user_id);

                        const fullName = [
                          profile?.first_name,
                          profile?.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ");

                        const isCurrentUser =
                          member.user_id === user?.id;

                        return (
                          <tr
                            key={member.id}
                            className="border-b border-slate-100 last:border-b-0"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                  <UserRound className="h-4 w-4 text-slate-500" />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-[13px] font-bold text-slate-900">
                                      {fullName ||
                                        "Profil à compléter"}
                                    </p>

                                    {isCurrentUser ? (
                                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                        Vous
                                      </span>
                                    ) : null}
                                  </div>

                                  <p className="mt-0.5 text-[11px] text-slate-400">
                                    ID utilisateur :{" "}
                                    {member.user_id.slice(0, 8)}…
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-[13px] text-slate-600">
                              {profile?.phone || "—"}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={[
                                  "inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ring-1 ring-inset",
                                  roleBadgeClass(member.role),
                                ].join(" ")}
                              >
                                {formatRole(member.role)}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={[
                                  "inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ring-1 ring-inset",
                                  member.is_active
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : "bg-slate-100 text-slate-500 ring-slate-200",
                                ].join(" ")}
                              >
                                {member.is_active
                                  ? "Actif"
                                  : "Inactif"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-[13px] font-bold text-slate-700">
                    Aucun membre visible
                  </p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    Les membres de l’organisation apparaîtront ici.
                  </p>
                </div>
              )}

              <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                <p className="text-[11px] text-slate-500">
                  L’adresse e-mail des autres utilisateurs n’est pas
                  exposée ici. Les invitations seront gérées côté
                  serveur via Supabase Auth.
                </p>
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
                    Paramètres V3
                  </h3>

                  <p className="mt-1 text-[12px] leading-5 text-slate-600">
                    Les informations principales de l’agence sont
                    modifiables et les membres de l’organisation
                    sont maintenant visibles selon les règles RLS.
                    L’invitation d’utilisateurs sera la prochaine
                    étape.
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
