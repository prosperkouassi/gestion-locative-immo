import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-red-500">
          Alteract
        </p>

        <h1 className="mt-3 font-[var(--font-manrope)] text-3xl font-bold text-slate-950">
          Dashboard
        </h1>

        <p className="mt-3 text-slate-500">
          Connexion réussie.
        </p>

        <div className="mt-8 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Cette page est maintenant protégée par votre session Supabase.
        </div>
      </div>
    </main>
  );
}