import {
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

function formatOwnerName(firstName: string | null, lastName: string | null) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Propriétaire";
}

function formatInitials(firstName: string | null, lastName: string | null) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";

  return `${first}${last}`.toUpperCase() || "PR";
}

export default async function OwnersPage() {
  const { supabase } = await requireAdminOrManager();

  const { data: owners } = await supabase
    .from("owners")
    .select(
      "id, first_name, last_name, email, phone, address, city, is_active, created_at"
    )
    .order("created_at", { ascending: false });

  const ownerRows = owners ?? [];
  const ownerIds = ownerRows.map((owner) => owner.id);

  const { data: properties } =
    ownerIds.length > 0
      ? await supabase
          .from("properties")
          .select("id, owner_id, name, city, is_active")
          .in("owner_id", ownerIds)
      : { data: [] };

  const propertyCountByOwner = new Map<string, number>();

  for (const property of properties ?? []) {
    propertyCountByOwner.set(
      property.owner_id,
      (propertyCountByOwner.get(property.owner_id) ?? 0) + 1
    );
  }

  const totalOwners = ownerRows.length;
  const activeOwners = ownerRows.filter((owner) => owner.is_active).length;
  const totalProperties = (properties ?? []).length;

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

              <button
                type="button"
                className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-red-600"
              >
                <Plus className="h-4 w-4" />
                Ajouter un propriétaire
              </button>
            </div>
          </header>

          <div className="space-y-6 p-5 md:p-8">
            <section>
              <div className="mb-4">
                <h2 className="text-[20px] font-extrabold text-slate-900">
                  Portefeuille propriétaires
                </h2>

                <p className="mt-1 text-[13px] text-slate-500">
                  Consultez les propriétaires rattachés à votre organisation et
                  leurs biens.
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

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900">
                    Liste des propriétaires
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    {ownerRows.length} propriétaire
                    {ownerRows.length > 1 ? "s" : ""} enregistré
                    {ownerRows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="relative w-full sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Rechercher un propriétaire..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {ownerRows.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {ownerRows.map((owner) => {
                    const propertyCount =
                      propertyCountByOwner.get(owner.id) ?? 0;

                    return (
                      <div
                        key={owner.id}
                        className="grid gap-4 px-5 py-5 transition hover:bg-slate-50/70 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_180px_120px]"
                      >
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
                              Réf. {owner.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[12px] text-slate-600">
                            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {owner.email || "Email non renseigné"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[12px] text-slate-600">
                            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                            <span>
                              {owner.phone || "Téléphone non renseigné"}
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
                              {propertyCount}
                            </p>

                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Bien{propertyCount > 1 ? "s" : ""}
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
                            ].join(" ")}
                          >
                            {owner.is_active ? "Actif" : "Inactif"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
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
                    Les propriétaires de votre organisation apparaîtront ici.
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
