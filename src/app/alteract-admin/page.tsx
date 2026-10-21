
import { requirePlatformAdmin } from "@/lib/alteract-admin/server";
import { AdminDashboard } from "./ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  const admin = await requirePlatformAdmin();

  // Accès réservé au Super Administrateur Alteract.
  // La vérification du rôle et du MFA (aal2)
  // reste assurée par requirePlatformAdmin().
  if (!admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-5 text-4xl">🔒</div>

          <h1 className="text-2xl font-extrabold text-slate-900">
            Accès privé Alteract
          </h1>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            Cet espace est exclusivement réservé au
            Super Administrateur de la plateforme Alteract.
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Connectez-vous avec votre compte administrateur
            et activez l'authentification multifacteur
            (MFA - niveau aal2).
          </p>

          <a
            href="/login"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-red-500 px-6 text-sm font-bold text-white transition hover:bg-red-600"
          >
            Se connecter
          </a>
        </section>
      </main>
    );
  }

  // Tableau de bord Super Administrateur existant.
  return <AdminDashboard />;
}
