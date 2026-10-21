
"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Users, ShieldCheck, LogOut, RefreshCw, Link2, ArrowUpRight, Layers3, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { UsersPanel } from "./users-panel";
import { SubscriptionOrdersPanel } from "./subscription-orders-panel";

type Organization = {
  id: string | null;
  organization_id: string;
  name: string;
  contact_email: string | null;
  kind: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  is_active: boolean;
  plan: string;
  linked: boolean;
  created_at: string;
  logements_utilises: number;
  collaborateurs_actifs: number;
};

type SelectedOrganization = {
  id: string;
  name: string;
};

const kindLabels: Record<string, string> = {
  agency: "Agence",
  landlord: "Bailleur",
  company: "Société",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
  ARCHIVED: "Archivée",
};

type Plan = "free" | "silver" | "gold";

const quotas: Record<Plan, { units: number | null; members: number | null }> = {
  free: { units: 5, members: 2 },
  silver: { units: 50, members: 10 },
  gold: { units: null, members: null },
};

function isPlan(value: string): value is Plan {
  return value === "free" || value === "silver" || value === "gold";
}

function QuotaCell({
  used,
  limit,
  label,
}: {
  used: number;
  limit: number | null;
  label: string;
}) {
  const ratio = limit === null ? 0 : Math.min(100, (used / limit) * 100);
  const reached = limit !== null && used >= limit;
  const near = limit !== null && ratio >= 80;
  return (
    <div style={{ minWidth: 135 }}>
      <strong style={{ fontSize: 14 }}>
        {used} / {limit === null ? "Illimité" : limit}
      </strong>
      {limit !== null ? (
        <>
          <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={Math.min(used, limit)}
            style={{ height: 7, background: "#e5e7eb", borderRadius: 99, overflow: "hidden", marginTop: 7 }}
          >
            <div style={{ height: "100%", width: `${ratio}%`, background: reached ? "#dc2626" : near ? "#d97706" : "#16a34a" }} />
          </div>
          {near && (
            <div style={{ fontSize: 11, color: reached ? "#b91c1c" : "#92400e", marginTop: 4 }}>
              {reached ? "Quota atteint" : "Proche de la limite"}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: "#667085", fontSize: 11, marginTop: 4 }}>Sans limite</div>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const [organizations, setOrganizations] = useState<
    Organization[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(
    null
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedPlans, setSelectedPlans] = useState<
    Record<string, string>
  >({});

  const [
    selectedOrganization,
    setSelectedOrganization,
  ] = useState<SelectedOrganization | null>(null);

  /**
   * Charger les organisations depuis Supabase
   * via l'API sécurisée Super Admin.
   */
  const refresh = useCallback(async () => {
    setError("");

    try {
      const response = await fetch(
        "/api/alteract-admin/clients",
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Impossible de charger les organisations."
        );
      }

      const result: { clients?: Organization[] } =
        await response.json();

      if (!Array.isArray(result.clients)) {
        throw new Error(
          "Réponse invalide du serveur."
        );
      }

      setOrganizations(result.clients);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur de chargement."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Rattacher une organisation existante
   * au registre administratif Alteract.
   */
  async function linkOrganization(
    organization: Organization
  ) {
    if (organization.linked || busyId !== null) {
      return;
    }

    setBusyId(organization.organization_id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/alteract-admin/clients",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            organization_id:
              organization.organization_id,
            kind: organization.kind,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Rattachement impossible."
        );
      }

      setSuccess(
        `${organization.name} a été rattachée au registre Super Admin.`
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du rattachement."
      );
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Modifier l'offre en conservant PostgreSQL
   * comme autorité finale sur les quotas.
   */
  async function changePlan(organization: Organization) {
    if (!organization.linked || !organization.id || busyId !== null) {
      return;
    }

    const newPlan =
      selectedPlans[organization.organization_id] ?? organization.plan;

    if (!isPlan(newPlan) || newPlan === organization.plan) {
      return;
    }

    const limits = quotas[newPlan];
    const overUnits =
      limits.units !== null &&
      organization.logements_utilises > limits.units;
    const overMembers =
      limits.members !== null &&
      organization.collaborateurs_actifs > limits.members;

    // Retour immédiat lorsque les compteurs affichés dépassent le quota.
    // L'API contrôle également les quotas en base, pour éviter les courses.
    if (overUnits || overMembers) {
      const reasons: string[] = [];

      if (overUnits) {
        reasons.push(
          `${organization.logements_utilises} logements pour une limite de ${limits.units}`
        );
      }
      if (overMembers) {
        reasons.push(
          `${organization.collaborateurs_actifs} collaborateurs actifs pour une limite de ${limits.members}`
        );
      }

      setSuccess("");
      setError(
        `Impossible de passer ${organization.name} à l'offre ${newPlan.toUpperCase()} : ` +
          reasons.join(" ; ") +
          ". Réduisez d'abord la consommation ou choisissez une offre supérieure."
      );
      return;
    }

    const confirmed = window.confirm(
      `Modifier l'abonnement de ${organization.name} ?\n\n` +
        `Offre actuelle : ${organization.plan.toUpperCase()}\n` +
        `Nouvelle offre : ${newPlan.toUpperCase()}`
    );

    if (!confirmed) return;

    setBusyId(organization.organization_id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/alteract-admin/clients/${encodeURIComponent(organization.id)}/plan`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: newPlan }),
        }
      );

      const result: { error?: string; code?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Modification de l'abonnement impossible."
        );
      }

      await refresh();

      setSelectedPlans((current) => {
        const next = { ...current };
        delete next[organization.organization_id];
        return next;
      });

      setSuccess(
        `L'offre de ${organization.name} est maintenant ${newPlan.toUpperCase()}.`
      );
    } catch (err) {
      setSuccess("");
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du changement d'abonnement."
      );
    } finally {
      setBusyId(null);
    }
  }

  function showUsers(organization: Organization) {
    setSelectedOrganization({
      id: organization.organization_id,
      name: organization.name,
    });
  }

  const total = organizations.length;

  const active = organizations.filter(
    (organization) =>
      organization.status === "ACTIVE" &&
      organization.is_active
  ).length;

  const suspended = organizations.filter(
    (organization) =>
      organization.status === "SUSPENDED" ||
      organization.status === "ARCHIVED" ||
      !organization.is_active
  ).length;

  const linked = organizations.filter(
    (organization) => organization.linked
  ).length;

  async function signOut() {
    if (busyId !== null || signingOut) return;
    setSigningOut(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      window.location.replace("/login");
    } catch {
      setError("La déconnexion a échoué. Veuillez réessayer.");
      setSigningOut(false);
    }
  }

  const stats = [
    { label: "Organisations", value: total, icon: Building2, accent: "text-red-500", bg: "bg-red-50" },
    { label: "Actives", value: active, icon: CheckCircle2, accent: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Suspendues / inactives", value: suspended, icon: AlertTriangle, accent: "text-amber-600", bg: "bg-amber-50" },
    { label: "Rattachées", value: linked, icon: Link2, accent: "text-slate-700", bg: "bg-slate-100" },
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center" aria-hidden="true">
              <span className="absolute h-10 w-3 -rotate-[32deg] rounded-full bg-red-500" />
              <span className="absolute h-10 w-3 rotate-[32deg] rounded-full bg-red-600" />
            </div>
            <div>
              <div className="font-[var(--font-manrope)] text-[23px] font-extrabold tracking-tight">Alteract</div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Gestion locative · Plateforme</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 sm:inline-flex"><ShieldCheck className="h-4 w-4" /> Super Admin</span>
            <button type="button" onClick={() => void signOut()} disabled={signingOut || busyId !== null} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50">
              <LogOut className="h-4 w-4" /> {signingOut ? "Déconnexion..." : "Se déconnecter"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-7 px-5 py-7 md:px-8 md:py-9">
        <section className="relative overflow-hidden rounded-[24px] bg-[#171717] px-6 py-8 text-white md:px-9 md:py-10">
          <div className="pointer-events-none absolute -right-12 -top-28 h-72 w-72 rounded-full border-[45px] border-red-500/10" aria-hidden="true" />
          <div className="relative">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-red-400">Espace privé · Administration</p>
            <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold tracking-tight md:text-4xl">Tableau de bord Super Admin</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">Pilotez les organisations clientes, leurs abonnements et leurs quotas depuis votre espace Alteract.</p>
            <div className="mt-6 h-1 w-14 rounded-full bg-red-500" />
          </div>
        </section>

        <section aria-label="Indicateurs des organisations" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, accent, bg }) => (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><p className="text-[13px] font-semibold text-slate-500">{label}</p><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}><Icon className={`h-5 w-5 ${accent}`} /></span></div>
              <p className="mt-4 font-[var(--font-manrope)] text-3xl font-extrabold">{value}</p>
            </article>
          ))}
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div><h2 className="font-[var(--font-manrope)] text-lg font-extrabold">Gestion des organisations</h2><p className="mt-1 max-w-2xl text-[13px] leading-6 text-slate-500">Rattachez une organisation existante au registre Alteract, gérez son offre et consultez ses utilisateurs.</p></div>
          <button type="button" onClick={() => { setLoading(true); void refresh(); }} disabled={loading || signingOut} className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{loading ? "Actualisation..." : "Actualiser"}</button>
        </section>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
        {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div>}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 md:px-6">
            <div><h2 className="font-[var(--font-manrope)] text-lg font-extrabold">Organisations clientes</h2><p className="mt-1 text-xs text-slate-500">{organizations.length} organisation{organizations.length > 1 ? "s" : ""} dans le registre</p></div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"><Layers3 className="h-4 w-4" /> Offres Free · Silver · Gold</span>
          </div>
          {loading ? <p className="px-6 py-12 text-center text-sm text-slate-500">Chargement des organisations...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-left text-[13px]">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500"><tr>{["Organisation", "Type", "Offre", "Logements", "Collaborateurs", "Statut", "Registre", "Actions"].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap border-b border-slate-200 px-5 py-4">{heading}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {organizations.map((organization) => (
                    <tr key={organization.organization_id} className="align-top transition hover:bg-slate-50/70">
                      <td className="px-5 py-5"><p className="font-bold text-slate-900">{organization.name}</p><p className="mt-1 text-xs text-slate-500">{organization.contact_email ?? "—"}</p></td>
                      <td className="px-5 py-5 text-slate-600">{kindLabels[organization.kind] ?? organization.kind}</td>
                      <td className="px-5 py-5">
                        {organization.linked && organization.id ? (
                          <div className="flex flex-col items-start gap-1">
  <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
    {organization.plan.toUpperCase()}
  </span>
  <span className="text-[11px] text-slate-500">
    Modification manuelle temporairement désactivée
  </span>
</div>
                        ) : <span className="text-xs text-slate-500">Free — non rattachée</span>}
                      </td>
                      <td className="px-5 py-5">{organization.linked && isPlan(organization.plan) ? <QuotaCell label={`Logements de ${organization.name}`} used={organization.logements_utilises} limit={quotas[organization.plan].units} /> : <span className="text-slate-400">—</span>}</td>
                      <td className="px-5 py-5">{organization.linked && isPlan(organization.plan) ? <QuotaCell label={`Collaborateurs de ${organization.name}`} used={organization.collaborateurs_actifs} limit={quotas[organization.plan].members} /> : <span className="text-slate-400">—</span>}</td>
                      <td className="px-5 py-5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${organization.status === "ACTIVE" && organization.is_active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{statusLabels[organization.status] ?? organization.status}{!organization.is_active && organization.status === "ACTIVE" ? " (inactive)" : ""}</span></td>
                      <td className="px-5 py-5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${organization.linked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{organization.linked ? "Rattachée" : "Non rattachée"}</span></td>
                      <td className="px-5 py-5"><div className="flex min-w-[175px] flex-col items-start gap-2">{!organization.linked ? <button type="button" disabled={busyId !== null || signingOut} onClick={() => void linkOrganization(organization)} className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"><Link2 className="h-3.5 w-3.5" />{busyId === organization.organization_id ? "Rattachement..." : "Rattacher"}</button> : <span className="text-xs font-medium text-emerald-700">Rattachement effectué</span>}<button type="button" onClick={() => showUsers(organization)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Users className="h-3.5 w-3.5" />Voir les utilisateurs <ArrowUpRight className="h-3 w-3" /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {organizations.length === 0 && <p className="px-6 py-12 text-center text-sm text-slate-500">Aucune organisation trouvée.</p>}
            </div>
          )}
        </section>
          <SubscriptionOrdersPanel />
        {selectedOrganization && <UsersPanel organizationId={selectedOrganization.id} organizationName={selectedOrganization.name} onClose={() => setSelectedOrganization(null)} />}

        <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />La consultation des utilisateurs est disponible en lecture seule. La suspension, la réactivation et la modification des rôles restent désactivées jusqu&apos;à la validation des contrôles d&apos;accès et des politiques RLS.</p>
      </div>
    </main>
  );
}
