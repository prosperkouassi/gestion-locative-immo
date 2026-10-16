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
import TotpMfaCard from "@/components/TotpMfaCard";

import { requireActiveMembership } from "@/lib/auth/access";



import {

  inviteUserAction,

  updateMemberAccessAction,

  updateOrganizationAction,

} from "./actions";



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



type SettingsPageProps = {

  searchParams: Promise<{

    status?: string;

    message?: string;

    activation?: string;

  }>;

};



export default async function SettingsPage({

  searchParams,

}: SettingsPageProps) {

  const params = await searchParams;

  const feedbackMessage = params.message?.trim() || null;

  const feedbackStatus =

    params.status === "success"

      ? "success"

      : params.status === "error"

        ? "error"

        : null;



  const activationLink =

    process.env.NODE_ENV === "development" &&

    params.activation?.startsWith("http")

      ? params.activation

      : null;



  const {
    supabase,
    membership,
    user,
  } = await requireActiveMembership();



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




  if (membership.role === "TENANT") {
    const ownProfile = profilesById.get(user.id);

    const tenantName =
      [ownProfile?.first_name, ownProfile?.last_name]
        .filter(Boolean)
        .join(" ") || "Locataire";

    return (
      <div className="h-screen overflow-hidden bg-[#F8FAFC]">
        <div className="flex h-screen">
          <AppSidebar />

          <main className="h-screen flex-1 overflow-y-auto">
            <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-red-500">
                  Mon compte
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
                    Mon espace
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-500">
                    Consultez les informations de votre compte et de votre agence.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-slate-500">
                        Mon nom
                      </p>
                      <UserRound className="h-5 w-5 text-red-500" />
                    </div>
                    <p className="mt-4 text-[18px] font-extrabold text-slate-900">
                      {tenantName}
                    </p>
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
                        Mon accès
                      </p>
                      <BadgeCheck className="h-5 w-5 text-emerald-500" />
                    </div>
                    <span className="mt-4 inline-flex rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                      Actif
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-slate-500">
                        Agence
                      </p>
                      <Building2 className="h-5 w-5 text-slate-600" />
                    </div>
                    <p className="mt-4 truncate text-[18px] font-extrabold text-slate-900">
                      {agencyName}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                        <UserRound className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-[16px] font-extrabold text-slate-900">
                          Mon compte
                        </h3>
                        <p className="mt-1 text-[12px] text-slate-500">
                          Informations associées à votre accès Alteract.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <div>
                      <p className="text-[12px] font-semibold text-slate-500">
                        Nom
                      </p>
                      <p className="mt-1 text-[13px] font-bold text-slate-900">
                        {tenantName}
                      </p>
                    </div>

                    <div>
                      <p className="text-[12px] font-semibold text-slate-500">
                        Email
                      </p>
                      <p className="mt-1 break-all text-[13px] font-bold text-slate-900">
                        {userEmail}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                        <Phone className="h-3.5 w-3.5" />
                        Téléphone
                      </p>
                      <p className="mt-1 text-[13px] font-bold text-slate-900">
                        {ownProfile?.phone || "Non renseigné"}
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
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                        <Building2 className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="text-[16px] font-extrabold text-slate-900">
                          Mon agence
                        </h3>
                        <p className="mt-1 text-[12px] text-slate-500">
                          Coordonnées de l’agence qui gère votre location.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <p className="text-[12px] font-semibold text-slate-500">
                        Nom
                      </p>
                      <p className="mt-1 text-[13px] font-bold text-slate-900">
                        {agencyName}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </p>
                      <p className="mt-1 text-[13px] font-bold text-slate-900">
                        {organization?.email || "Non renseigné"}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                        <Phone className="h-3.5 w-3.5" />
                        Téléphone
                      </p>
                      <p className="mt-1 text-[13px] font-bold text-slate-900">
                        {organization?.phone || "Non renseigné"}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        Adresse
                      </p>
                      <p className="mt-1 text-[13px] font-bold text-slate-900">
                        {[
                          organization?.address,
                          organization?.city,
                          organization?.country,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Non renseignée"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[12px] font-semibold text-slate-500">
                        Statut
                      </p>
                      <span
                        className={[
                          "mt-2 inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                          organizationStatus.className,
                        ].join(" ")}
                      >
                        {organizationStatus.label}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <TotpMfaCard />

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <LockKeyhole className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900">
                      Accès protégé
                    </h3>
                    <p className="mt-1 max-w-3xl text-[12px] leading-5 text-slate-500">
                      La gestion de l’agence, des utilisateurs, des rôles et des règles
                      de configuration est réservée aux administrateurs de l’agence.
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

            {feedbackMessage && feedbackStatus ? (

              <div

                role="status"

                className={[

                  "flex items-start gap-3 rounded-2xl border p-4 text-[13px] font-semibold shadow-sm",

                  feedbackStatus === "success"

                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"

                    : "border-red-200 bg-red-50 text-red-700",

                ].join(" ")}

              >

                {feedbackStatus === "success" ? (

                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />

                ) : (

                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />

                )}



                <p>{feedbackMessage}</p>

              </div>

            ) : null}



            {activationLink ? (

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">

                <div className="flex items-start gap-3">

                  <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />



                  <div className="min-w-0 flex-1">

                    <h3 className="text-[14px] font-extrabold text-slate-900">

                      Lien d’activation local

                    </h3>



                    <p className="mt-1 text-[12px] leading-5 text-slate-600">

                      Copiez ce lien puis ouvrez-le dans une fenêtre

                      privée/incognito. Ne l’ouvrez pas dans la session

                      administrateur actuelle.

                    </p>



                    <input

                      type="text"

                      readOnly

                      value={activationLink}

                      className="mt-3 h-11 w-full rounded-xl border border-blue-200 bg-white px-3 text-[12px] text-slate-700 outline-none"

                    />



                    <p className="mt-2 text-[11px] leading-5 text-slate-500">

                      Ce lien contient un jeton d’activation temporaire.

                      Il est affiché uniquement pour le développement local

                      et ne doit pas être partagé.

                    </p>

                  </div>

                </div>

              </div>

            ) : null}



            <section>

              <div className="mb-4">

                <h2 className="text-[20px] font-extrabold text-slate-900">

                  Configuration Alteract

                </h2>



                <p className="mt-1 text-[13px] text-slate-500">

                  Gérez les informations de l’agence, les accès,

                  les documents et les règles de gestion.

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

                        placeholder="contact\@agence.com"

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



            {canEditOrganization ? (

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 px-5 py-5">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">

                      <UserPlus className="h-5 w-5 text-red-500" />

                    </div>



                    <div>

                      <h3 className="text-[16px] font-extrabold text-slate-900">

                        Inviter un utilisateur

                      </h3>



                      <p className="mt-1 text-[12px] text-slate-500">

                        Créez un accès et envoyez une invitation par e-mail.

                      </p>

                    </div>

                  </div>

                </div>



                <form

                  action={inviteUserAction}

                  className="space-y-5 p-5"

                >

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                    <label className="space-y-1.5 xl:col-span-2">

                      <span className="text-[12px] font-semibold text-slate-600">

                        Email *

                      </span>

                      <input

                        name="invite_email"

                        type="email"

                        required

                        maxLength={160}

                        placeholder="utilisateur\@exemple.com"

                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50"

                      />

                    </label>



                    <label className="space-y-1.5">

                      <span className="text-[12px] font-semibold text-slate-600">

                        Prénom *

                      </span>

                      <input

                        name="invite_first_name"

                        type="text"

                        required

                        maxLength={120}

                        placeholder="Prénom"

                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50"

                      />

                    </label>



                    <label className="space-y-1.5">

                      <span className="text-[12px] font-semibold text-slate-600">

                        Nom *

                      </span>

                      <input

                        name="invite_last_name"

                        type="text"

                        required

                        maxLength={120}

                        placeholder="Nom"

                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50"

                      />

                    </label>



                    <label className="space-y-1.5 xl:col-span-2">

                      <span className="text-[12px] font-semibold text-slate-600">

                        Téléphone

                      </span>

                      <input

                        name="invite_phone"

                        type="tel"

                        maxLength={40}

                        placeholder="+225 00 00 00 00 00"

                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50"

                      />

                    </label>



                    <label className="space-y-1.5 xl:col-span-2">

                      <span className="text-[12px] font-semibold text-slate-600">

                        Rôle *

                      </span>

                      <select

                        name="invite_role"

                        required

                        defaultValue="MANAGER"

                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"

                      >

                        <option value="MANAGER">Gestionnaire</option>

                        <option value="OWNER">Propriétaire</option>

                        <option value="TENANT">Locataire</option>

                      </select>

                    </label>

                  </div>



                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">

                    <p className="max-w-2xl text-[11px] leading-5 text-slate-500">

                      La configuration SMTP peut être finalisée plus tard.

                      La logique d’invitation reste prête côté serveur.

                    </p>



                    <button

                      type="submit"

                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-red-600"

                    >

                      <UserPlus className="h-4 w-4" />

                      Envoyer l’invitation

                    </button>

                  </div>

                </form>

              </section>

            ) : null}



            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">

                    <Users className="h-5 w-5 text-red-500" />

                  </div>



                  <div>

                    <h3 className="text-[16px] font-extrabold text-slate-900">

                      Utilisateurs et rôles

                    </h3>



                    <p className="mt-1 text-[12px] text-slate-500">

                      Modifiez le rôle ou l’état d’accès des membres.

                    </p>

                  </div>

                </div>

              </div>



              {visibleMembers.length > 0 ? (

                <div className="divide-y divide-slate-100">

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



                    const canManageMember =

                      canEditOrganization &&

                      !isCurrentUser &&

                      member.role !== "ADMIN_AGENCY";



                    return (

                      <div

                        key={member.id}

                        className="grid gap-4 px-5 py-5 xl:grid-cols-[1.2fr_0.8fr_1.8fr] xl:items-center"

                      >

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">

                            <UserRound className="h-4 w-4 text-slate-500" />

                          </div>



                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <p className="truncate text-[13px] font-bold text-slate-900">

                                {fullName || "Profil à compléter"}

                              </p>



                              {isCurrentUser ? (

                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">

                                  Vous

                                </span>

                              ) : null}

                            </div>



                            <p className="mt-1 text-[11px] text-slate-400">

                              {profile?.phone || "Téléphone non renseigné"}

                            </p>

                          </div>

                        </div>



                        <div className="flex flex-wrap gap-2">

                          <span

                            className={[

                              "inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ring-1 ring-inset",

                              roleBadgeClass(member.role),

                            ].join(" ")}

                          >

                            {formatRole(member.role)}

                          </span>



                          <span

                            className={[

                              "inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ring-1 ring-inset",

                              member.is_active

                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"

                                : "bg-slate-100 text-slate-500 ring-slate-200",

                            ].join(" ")}

                          >

                            {member.is_active ? "Actif" : "Inactif"}

                          </span>

                        </div>



                        {canManageMember ? (

                          <form

                            action={updateMemberAccessAction}

                            className="grid gap-3 sm:grid-cols-[1fr_145px_auto] sm:items-end"

                          >

                            <input

                              type="hidden"

                              name="membership_id"

                              value={member.id}

                            />



                            <label className="space-y-1.5">

                              <span className="text-[11px] font-semibold text-slate-500">

                                Rôle

                              </span>



                              <select

                                name="member_role"

                                defaultValue={member.role ?? "MANAGER"}

                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-900 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"

                              >

                                <option value="MANAGER">Gestionnaire</option>

                                <option value="OWNER">Propriétaire</option>

                                <option value="TENANT">Locataire</option>

                              </select>

                            </label>



                            <label className="space-y-1.5">

                              <span className="text-[11px] font-semibold text-slate-500">

                                Accès

                              </span>



                              <select

                                name="member_is_active"

                                defaultValue={

                                  member.is_active ? "true" : "false"

                                }

                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-900 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"

                              >

                                <option value="true">Actif</option>

                                <option value="false">Inactif</option>

                              </select>

                            </label>



                            <button

                              type="submit"

                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[12px] font-bold text-white transition hover:bg-slate-800"

                            >

                              <Save className="h-3.5 w-3.5" />

                              Enregistrer

                            </button>

                          </form>

                        ) : (

                          <p className="text-[11px] leading-5 text-slate-400">

                            {isCurrentUser

                              ? "Votre propre accès administrateur est protégé contre les modifications accidentelles."

                              : "Cet accès administrateur est protégé."}

                          </p>

                        )}

                      </div>

                    );

                  })}

                </div>

              ) : (

                <div className="px-5 py-10 text-center">

                  <Users className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-3 text-[13px] font-bold text-slate-700">

                    Aucun membre visible

                  </p>

                </div>

              )}

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

                        Devise, formats et préférences générales.

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

                        Préfixes et règles des reçus et quittances.

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

                        Échéances, paiements et règles financières.

                      </p>

                    </div>

                  </div>

                </div>



                <TotpMfaCard />



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

                        Invitations et rôles organisationnels.

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

                        Actions administratives protégées.

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

                    Paramètres V5

                  </h3>



                  <p className="mt-1 text-[12px] leading-5 text-slate-600">

                    Les administrateurs d’agence peuvent maintenant

                    modifier le rôle et activer ou désactiver les

                    autres membres, tout en protégeant leur propre

                    accès administrateur.

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
