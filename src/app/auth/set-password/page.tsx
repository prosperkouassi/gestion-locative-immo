"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 8) {
      setErrorMessage(
        "Le mot de passe doit contenir au moins 8 caractères."
      );
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage(
        "Les deux mots de passe ne correspondent pas."
      );
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setIsSubmitting(false);

      if (
        error.message.toLowerCase().includes("session") ||
        error.message.toLowerCase().includes("auth")
      ) {
        setErrorMessage(
          "Votre lien d’activation n’est plus valide. Demandez une nouvelle invitation."
        );
        return;
      }

      setErrorMessage(
        "Impossible de définir le mot de passe. Réessayez."
      );
      return;
    }

    setSuccessMessage(
      "Votre mot de passe a été défini. Vous allez être redirigé vers la connexion."
    );

    await supabase.auth.signOut();

    window.setTimeout(() => {
      router.replace("/login?password=created");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <KeyRound className="h-6 w-6 text-red-500" />
            </div>

            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-red-500">
              Activation du compte
            </p>

            <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-[#111827]">
              Définir mon mot de passe
            </h1>

            <p className="mt-2 text-[13px] leading-6 text-slate-500">
              Choisissez le mot de passe que vous utiliserez pour vous
              connecter à Alteract.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-[13px] font-semibold text-slate-700">
                Nouveau mot de passe
              </span>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  minLength={8}
                  autoComplete="new-password"
                  required
                  placeholder="Minimum 8 caractères"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-12 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-[13px] font-semibold text-slate-700">
                Confirmer le mot de passe
              </span>

              <div className="relative">
                <input
                  type={
                    showPasswordConfirmation ? "text" : "password"
                  }
                  value={passwordConfirmation}
                  onChange={(event) =>
                    setPasswordConfirmation(event.target.value)
                  }
                  minLength={8}
                  autoComplete="new-password"
                  required
                  placeholder="Saisissez à nouveau le mot de passe"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-12 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPasswordConfirmation(
                      (current) => !current
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  aria-label={
                    showPasswordConfirmation
                      ? "Masquer la confirmation"
                      : "Afficher la confirmation"
                  }
                >
                  {showPasswordConfirmation ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium leading-5 text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium leading-5 text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{successMessage}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || Boolean(successMessage)}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-[14px] font-bold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Définir mon mot de passe
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-[11px] leading-5 text-slate-400">
              Après validation, vous pourrez vous connecter avec votre
              adresse e-mail et ce mot de passe.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
