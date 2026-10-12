import {
  BadgeCheck,
  Bell,
  Building2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  UserRound,
} from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import { requireAdminOrManager } from "@/lib/auth/access";

import {
  createOwnerAction,
  deleteOwnerAction,
  toggleOwnerActiveAction,
  updateOwnerAction,
} from "./actions";
import DeleteOwnerButton from "./DeleteOwnerButton";
import OwnerSubmitButton from "./OwnerSubmitButton";

function formatOwnerName(
  firstName: string | null,
  lastName: string | null
) {
  return (
    `${firstName ?? ""} ${
      lastName ?? ""
    }`.trim() || "Propriétaire"
  );
}

function formatInitials(
  firstName: string | null,
  lastName: string | null
) {
  const first =
    firstName?.trim()?.[0] ?? "";
  const last =
    lastName?.trim()?.[0] ?? "";

  return (
    `${first}${last}`.toUpperCase() ||
    "PR"
  );
}

type OwnersPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    message?: string;
  }>;
};

export default async function OwnersPage({
  searchParams,
}: OwnersPageProps) {
  const params = await searchParams;

  const query =
    params.q?.trim() ?? "";

  const feedbackStatus =
    params.status === "success"
      ? "success"
      : params.status === "error"
        ? "error"
        : null;

  const feedbackMessage =
    params.message?.trim() || null;

  const {
    supabase,
    membership,
  } = await requireAdminOrManager();

  const {
    data: owners,
    error: ownersError,
  } = await supabase
    .from("owners")
    .select(
      "id, first_name, last_name, email, phone, address, city, is_active, created_at"
    )
    .eq(
      "organization_id",
      membership.organization_id
    )
    .order("created_at", {
      ascending: false,
    });

  if (ownersError) {
    console.error(
      "Erreur chargement propriétaires :",
      ownersError
    );
  }

  const ownerRows =
    owners ?? [];

  const filteredOwners = query
    ? ownerRows.filter((owner) => {
        const haystack = [
          owner.first_name,
          owner.last_name,
          owner.email,
          owner.phone,
          owner.address,
          owner.city,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr");

        return haystack.includes(
          query.toLocaleLowerCase("fr")
        );
      })
    : ownerRows;

  const ownerIds =
    ownerRows.map(
      (owner) => owner.id
    );

  const { data: properties } =
    ownerIds.length > 0
      ? await supabase
          .from("properties")
          .select(
            "id, owner_id, name, city, is_active"
          )
          .eq(
            "organization_id",
            membership.organization_id
          )
          .in(
            "owner_id",
            ownerIds
          )
      : { data: [] };

  const propertyCountByOwner =
    new Map<string, number>();

  for (
    const property of
    properties ?? []
  ) {
    propertyCountByOwner.set(
      property.owner_id,
      (propertyCountByOwner.get(
        property.owner_id
      ) ?? 0) + 1
    );
  }

  const totalOwners =
    ownerRows.length;

  const activeOwners =
    ownerRows.filter(
      (owner) =>
        owner.is_active
    ).length;

  const totalProperties =
    (properties ?? []).length;

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="flex h-screen">
        <AppSidebar />

        <main className="h-screen flex-1 overflow-y-auto">
          <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-red-500">
                Gestion locative
              </p>

              <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#111827]">
                Propriétaires
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="#search-owners"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
                aria-label="Rechercher un propriétaire"
              >
                <Search className="h-4 w-4" />
              </a>

              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </button>

              <a
                href="#new-owner"
                className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-red-600"
              >
                <Plus className="h-4 w-4" />
                Ajouter un propriétaire
              </a>
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            {feedbackMessage &&
            feedbackStatus ? (
              <div
                role="status"
                className={[
                  "flex items-start gap-3 rounded-2xl border p-4 text-[13px] font-semibold shadow-sm",
                  feedbackStatus ===
                  "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700",
                ].join(" ")}
              >
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  {feedbackMessage}
                </p>
              </div>
            ) : null}

            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Portefeuille propriétaires
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Consultez les propriétaires rattachés à votre organisation et leurs biens.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Propriétaires
                    </p>

                    <UserRound className="h-5 w-5 text-red-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {totalOwners}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Actifs
                    </p>

                    <UserRound className="h-5 w-5 text-emerald-500" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {activeOwners}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-slate-500">
                      Biens liés
                    </p>

                    <Building2 className="h-5 w-5 text-slate-600" />
                  </div>

                  <p className="mt-4 text-[30px] font-extrabold text-slate-900">
                    {totalProperties}
                  </p>
                </div>
              </div>
            </section>

            <section
              id="new-owner"
              className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 px-5 py-5">
                <h2 className="text-[18px] font-extrabold text-slate-900">
                  Ajouter un propriétaire
                </h2>

                <p className="mt-1 text-[12px] text-slate-500">
                  Créez une fiche propriétaire dans votre organisation.
                </p>
              </div>

              <form
                action={
                  createOwnerAction
                }
                className="space-y-5 p-5"
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Prénom *
                    </span>

                    <input
                      name="first_name"
                      type="text"
                      required
                      maxLength={120}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Nom *
                    </span>

                    <input
                      name="last_name"
                      type="text"
                      required
                      maxLength={120}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Email
                    </span>

                    <input
                      name="email"
                      type="email"
                      maxLength={160}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Téléphone
                    </span>

                    <input
                      name="phone"
                      type="tel"
                      maxLength={40}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5 md:col-span-2 xl:col-span-3">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Adresse
                    </span>

                    <input
                      name="address"
                      type="text"
                      maxLength={240}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
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
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <OwnerSubmitButton />
                </div>
              </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Liste des propriétaires
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    {filteredOwners.length} propriétaire
                    {filteredOwners.length >
                    1
                      ? "s"
                      : ""}{" "}
                    affiché
                    {filteredOwners.length >
                    1
                      ? "s"
                      : ""}
                  </p>
                </div>

                <form
                  id="search-owners"
                  method="get"
                  className="flex w-full gap-2 sm:w-auto"
                >
                  <div className="relative flex-1 sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      name="q"
                      type="search"
                      defaultValue={
                        query
                      }
                      placeholder="Rechercher un propriétaire..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </div>

                  <button
                    type="submit"
                    className="h-10 rounded-xl bg-slate-900 px-4 text-[12px] font-bold text-white"
                  >
                    Rechercher
                  </button>

                  {query ? (
                    <a
                      href="/owners"
                      className="flex h-10 items-center rounded-xl border border-slate-200 px-3 text-[12px] font-semibold text-slate-600"
                    >
                      Effacer
                    </a>
                  ) : null}
                </form>
              </div>

              {filteredOwners.length >
              0 ? (
                <div className="divide-y divide-slate-100">
                  {filteredOwners.map(
                    (owner) => {
                      const propertyCount =
                        propertyCountByOwner.get(
                          owner.id
                        ) ?? 0;

                      return (
                        <div
                          key={
                            owner.id
                          }
                          className="px-5 py-5 transition hover:bg-slate-50/70"
                        >
                          <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_180px_120px_auto] md:items-center">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-[13px] font-extrabold text-red-500">
                                {formatInitials(
                                  owner.first_name,
                                  owner.last_name
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-[14px] font-bold text-slate-900">
                                  {formatOwnerName(
                                    owner.first_name,
                                    owner.last_name
                                  )}
                                </p>

                                <p className="mt-1 text-[12px] text-slate-400">
                                  Réf.{" "}
                                  {owner.id
                                    .slice(
                                      0,
                                      8
                                    )
                                    .toUpperCase()}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-[12px] text-slate-600">
                                <Mail className="h-4 w-4 shrink-0 text-slate-400" />

                                <span className="truncate">
                                  {owner.email ||
                                    "Email non renseigné"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-[12px] text-slate-600">
                                <Phone className="h-4 w-4 shrink-0 text-slate-400" />

                                <span>
                                  {owner.phone ||
                                    "Téléphone non renseigné"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-[12px] text-slate-600">
                                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />

                                <span className="truncate">
                                  {owner.address ||
                                    owner.city ||
                                    "Adresse non renseignée"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center md:justify-center">
                              <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                                <p className="text-[22px] font-extrabold text-slate-900">
                                  {
                                    propertyCount
                                  }
                                </p>

                                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                  Bien
                                  {propertyCount >
                                  1
                                    ? "s"
                                    : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center md:justify-end">
                              <span
                                className={[
                                  "inline-flex rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
                                  owner.is_active
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : "bg-slate-100 text-slate-500 ring-slate-200",
                                ].join(
                                  " "
                                )}
                              >
                                {owner.is_active
                                  ? "Actif"
                                  : "Inactif"}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 md:justify-end">
                              <details className="relative">
                                <summary className="cursor-pointer list-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:border-red-200 hover:text-red-600">
                                  Modifier
                                </summary>

                                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:absolute md:right-0 md:z-20 md:w-[620px] md:shadow-xl">
                                  <form
                                    action={
                                      updateOwnerAction
                                    }
                                    className="space-y-4"
                                  >
                                    <input
                                      type="hidden"
                                      name="owner_id"
                                      value={
                                        owner.id
                                      }
                                    />

                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <input
                                        name="first_name"
                                        required
                                        maxLength={
                                          120
                                        }
                                        defaultValue={
                                          owner.first_name ??
                                          ""
                                        }
                                        placeholder="Prénom"
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-red-300"
                                      />

                                      <input
                                        name="last_name"
                                        required
                                        maxLength={
                                          120
                                        }
                                        defaultValue={
                                          owner.last_name ??
                                          ""
                                        }
                                        placeholder="Nom"
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-red-300"
                                      />

                                      <input
                                        name="email"
                                        type="email"
                                        maxLength={
                                          160
                                        }
                                        defaultValue={
                                          owner.email ??
                                          ""
                                        }
                                        placeholder="Email"
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-red-300"
                                      />

                                      <input
                                        name="phone"
                                        type="tel"
                                        maxLength={
                                          40
                                        }
                                        defaultValue={
                                          owner.phone ??
                                          ""
                                        }
                                        placeholder="Téléphone"
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-red-300"
                                      />

                                      <input
                                        name="address"
                                        maxLength={
                                          240
                                        }
                                        defaultValue={
                                          owner.address ??
                                          ""
                                        }
                                        placeholder="Adresse"
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-red-300 sm:col-span-2"
                                      />

                                      <input
                                        name="city"
                                        maxLength={
                                          120
                                        }
                                        defaultValue={
                                          owner.city ??
                                          ""
                                        }
                                        placeholder="Ville"
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-red-300 sm:col-span-2"
                                      />
                                    </div>

                                    <div className="flex justify-end">
                                      <button
                                        type="submit"
                                        className="h-10 rounded-xl bg-slate-900 px-4 text-[12px] font-bold text-white"
                                      >
                                        Enregistrer
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              </details>

                              <form
                                action={
                                  toggleOwnerActiveAction
                                }
                              >
                                <input
                                  type="hidden"
                                  name="owner_id"
                                  value={
                                    owner.id
                                  }
                                />

                                <input
                                  type="hidden"
                                  name="next_is_active"
                                  value={
                                    owner.is_active
                                      ? "false"
                                      : "true"
                                  }
                                />

                                <button
                                  type="submit"
                                  className={[
                                    "rounded-xl border px-3 py-2 text-[12px] font-semibold transition",
                                    owner.is_active
                                      ? "border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                                  ].join(
                                    " "
                                  )}
                                >
                                  {owner.is_active
                                    ? "Désactiver"
                                    : "Réactiver"}
                                </button>
                              </form>

                              <form
                                action={
                                  deleteOwnerAction
                                }
                              >
                                <input
                                  type="hidden"
                                  name="owner_id"
                                  value={
                                    owner.id
                                  }
                                />

                                <DeleteOwnerButton
                                  ownerName={formatOwnerName(
                                    owner.first_name,
                                    owner.last_name
                                  )}
                                />
                              </form>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                    <UserRound className="h-6 w-6 text-red-500" />
                  </div>

                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">
                    Aucun propriétaire
                  </h3>

                  <p className="mt-1 max-w-md text-[13px] text-slate-500">
                    {query
                      ? "Aucun propriétaire ne correspond à votre recherche."
                      : "Les propriétaires de votre organisation apparaîtront ici."}
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}