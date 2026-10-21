"use client";

import { FormEvent, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Eye,
  EyeOff,
  Globe2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        setError("Adresse e-mail ou mot de passe incorrect.");
        setIsLoading(false);
        return;
      }

      const {
        data: aalData,
        error: aalError,
      } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        await supabase.auth.signOut();

        setError(
          "Impossible de vérifier le niveau de sécurité de votre session."
        );
        setIsLoading(false);
        return;
      }

      if (
        aalData.currentLevel === "aal1" &&
        aalData.nextLevel === "aal2"
      ) {
        const {
          data: factorsData,
          error: factorsError,
        } = await supabase.auth.mfa.listFactors();

        if (factorsError) {
          await supabase.auth.signOut();

          setError(
            "Impossible de charger votre méthode d’authentification à deux facteurs."
          );
          setIsLoading(false);
          return;
        }

        const totpFactor =
          factorsData.totp.find(
            (factor) =>
              factor.status === "verified"
          ) ?? factorsData.totp[0];

        if (!totpFactor) {
          await supabase.auth.signOut();

          setError(
            "Aucun Authenticator TOTP valide n’a été trouvé pour ce compte."
          );
          setIsLoading(false);
          return;
        }

        setMfaFactorId(totpFactor.id);
        setMfaRequired(true);
        setMfaCode("");
        setPassword("");
        setIsLoading(false);
        return;
      }

      window.location.href = "/auth/redirect";
    } catch {
      setError(
        "Une erreur est survenue pendant la connexion. Veuillez réessayer."
      );
      setIsLoading(false);
    }
  }

  async function handleMfaSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedCode = mfaCode.replace(/\s+/g, "");

    if (!/^\d{6}$/.test(normalizedCode)) {
      setError(
        "Saisissez le code à 6 chiffres affiché dans votre application Authenticator."
      );
      return;
    }

    if (!mfaFactorId) {
      setError(
        "Le facteur d’authentification n’est pas disponible. Reconnectez-vous."
      );
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error: verifyError } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId: mfaFactorId,
          code: normalizedCode,
        });

      if (verifyError) {
        setError(
          "Code incorrect ou expiré. Ouvrez votre application Authenticator et saisissez le code actuel."
        );
        setIsLoading(false);
        return;
      }

      const {
        data: aalData,
        error: aalError,
      } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (
        aalError ||
        aalData.currentLevel !== "aal2"
      ) {
        setError(
          "La vérification du second facteur n’a pas pu être confirmée."
        );
        setIsLoading(false);
        return;
      }

      window.location.href = "/auth/redirect";
    } catch {
      setError(
        "Une erreur est survenue pendant la vérification du code. Veuillez réessayer."
      );
      setIsLoading(false);
    }
  }

  async function handleMfaCancel() {
    const supabase = createClient();

    await supabase.auth.signOut();

    setMfaRequired(false);
    setMfaFactorId("");
    setMfaCode("");
    setPassword("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[57%_43%]">
      {/* =========================================================
          PARTIE GAUCHE — BRANDING
      ========================================================== */}
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <img
          src="/images/login-building.webp"
          alt="Résidence moderne"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/5 to-transparent" />

        <div className="relative z-10 flex min-h-screen flex-col px-8 py-8 xl:px-14 xl:py-10 2xl:px-16">
          {/* Logo */}
          <div className="flex items-start justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 items-center justify-center">
                <span className="absolute h-14 w-4 -rotate-[32deg] rounded-full bg-red-500" />
                <span className="absolute h-14 w-4 rotate-[32deg] rounded-full bg-red-600" />
              </div>

              <div>
                <div className="font-[var(--font-manrope)] text-3xl font-extrabold tracking-tight text-slate-950">
                  Alteract
                </div>

                <div className="text-lg font-medium text-slate-700">
                  Gestion Locative
                </div>
              </div>
            </div>

            <div className="hidden max-w-[280px] items-center gap-5 xl:flex">
              <div className="h-14 w-[2px] bg-red-500" />

              <p className="text-base font-medium leading-6 text-slate-900">
                Plus qu&apos;un logiciel,
                <br />
                un partenaire de confiance.
              </p>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="mt-auto max-w-[600px] pb-4">
            <h1 className="font-[var(--font-manrope)] text-4xl font-extrabold leading-[1.12] tracking-tight text-white xl:text-5xl">
              Simplifiez
              <br />
              la gestion locative.
              <br />
              Valorisez votre
              <br />
              patrimoine.
            </h1>

            <div className="mt-6 h-1 w-14 rounded-full bg-red-500" />

            <p className="mt-5 max-w-[520px] text-base leading-7 text-white/90 xl:text-lg">
              Un SaaS complet et intuitif pour les agences immobilières,
              les propriétaires et les locataires.
            </p>

            {/* Avantages */}
            <div className="mt-9 grid max-w-[580px] grid-cols-4 gap-3">
              <FeatureCard
                icon={<Building2 size={27} strokeWidth={1.8} />}
                label={
                  <>
                    Gérez
                    <br />
                    vos biens
                  </>
                }
              />

              <FeatureCard
                icon={<Users size={27} strokeWidth={1.8} />}
                label={
                  <>
                    Suivez
                    <br />
                    vos locataires
                  </>
                }
              />

              <FeatureCard
                icon={<BarChart3 size={27} strokeWidth={1.8} />}
                label={
                  <>
                    Optimisez
                    <br />
                    vos revenus
                  </>
                }
              />

              <FeatureCard
                icon={<ShieldCheck size={27} strokeWidth={1.8} />}
                label={
                  <>
                    En toute
                    <br />
                    sécurité
                  </>
                }
              />
            </div>

            {/* Footer partie gauche */}
            <div className="mt-10 flex items-end justify-between gap-8">
              <div>
                <div className="flex gap-2">
                  <span className="h-1 w-11 rounded-full bg-red-500" />
                  <span className="h-1 w-7 rounded-full bg-white/30" />
                  <span className="h-1 w-7 rounded-full bg-white/30" />
                </div>

                <p className="mt-5 text-sm text-white/85 xl:text-base">
                  Construisons ensemble la gestion locative de demain.
                </p>
              </div>

              <div className="hidden shrink-0 pb-1 text-right xl:block">
                <p className="font-[var(--font-manrope)] text-lg italic leading-7 text-white/90">
                  “Des biens.
                  <br />
                  Des personnes.
                  <br />
                  Un meilleur avenir.”
                </p>

                <div className="ml-auto mt-5 h-1 w-12 rounded-full bg-red-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          PARTIE DROITE — CONNEXION
      ========================================================== */}
      <section className="relative flex min-h-screen overflow-hidden bg-white">
        {/* A décoratif */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 top-24 select-none font-[var(--font-manrope)] text-[420px] font-black leading-none text-red-500/[0.035]"
        >
          A
        </div>

        {/* Logo mobile */}
        <div className="absolute left-6 top-6 flex items-center gap-3 lg:hidden">
          <div className="relative flex h-9 w-9 items-center justify-center">
            <span className="absolute h-9 w-2.5 -rotate-[32deg] rounded-full bg-red-500" />
            <span className="absolute h-9 w-2.5 rotate-[32deg] rounded-full bg-red-600" />
          </div>

          <div>
            <p className="font-[var(--font-manrope)] text-xl font-extrabold leading-none text-slate-950">
              Alteract
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Gestion Locative
            </p>
          </div>
        </div>

        {/* Langue */}
        <div className="absolute right-6 top-6 sm:right-10 sm:top-8 xl:right-14">
          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Globe2 size={18} />

            <span className="hidden sm:inline">
              Français
            </span>

            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Formulaire */}
        <div className="relative z-10 m-auto w-full max-w-[520px] px-6 py-28 sm:px-10 lg:px-12 xl:px-14">
          <div className="mb-9">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-red-500 lg:hidden">
              Gestion locative
            </p>

            <h2 className="font-[var(--font-manrope)] text-4xl font-extrabold tracking-tight text-slate-950 sm:text-[42px]">
              {mfaRequired
                ? "Vérification sécurisée"
                : "Bon retour !"}
            </h2>

            <p className="mt-3 text-base text-slate-500 sm:text-lg">
              {mfaRequired
                ? "Saisissez le code affiché dans votre application Authenticator."
                : "Connectez-vous à votre espace Alteract."}
            </p>
          </div>

          {mfaRequired ? (
            <form
              onSubmit={handleMfaSubmit}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                    <ShieldCheck size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-emerald-900">
                      Authentification à deux facteurs
                    </p>

                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      Ouvrez Google Authenticator, Microsoft Authenticator
                      ou votre application TOTP puis saisissez le code actuel
                      associé à Alteract.
                    </p>

                    <p className="mt-2 break-all text-xs font-medium text-emerald-700">
                      Compte : {email}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="mfa-code"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Code d’authentification
                </label>

                <div className="group relative">
                  <LockKeyhole
                    size={20}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition group-focus-within:text-red-500"
                  />

                  <input
                    id="mfa-code"
                    name="mfa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    autoFocus
                    value={mfaCode}
                    onChange={(event) => {
                      const digits =
                        event.target.value.replace(/\D/g, "");

                      setMfaCode(digits.slice(0, 6));

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="000000"
                    className="h-14 w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-center font-[var(--font-manrope)] text-2xl font-extrabold tracking-[0.35em] text-slate-950 outline-none transition placeholder:text-slate-300 hover:border-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Le code comporte 6 chiffres et change automatiquement
                  dans votre application Authenticator.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isLoading ||
                  mfaCode.length !== 6
                }
                className="group flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-red-500 px-6 font-semibold text-white shadow-lg shadow-red-500/15 transition duration-200 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  {isLoading
                    ? "Vérification..."
                    : "Vérifier le code"}
                </span>

                {!isLoading && (
                  <ArrowRight
                    size={19}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={handleMfaCancel}
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Utiliser un autre compte
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Adresse e-mail
                </label>

                <div className="group relative">
                  <Mail
                    size={20}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition group-focus-within:text-red-500"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="votre@email.com"
                    className="h-13 w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Mot de passe
                </label>

                <div className="group relative">
                  <LockKeyhole
                    size={20}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition group-focus-within:text-red-500"
                  />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="Votre mot de passe"
                    className="h-13 w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-12 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-3 text-slate-700">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(event.target.checked)
                    }
                    className="peer sr-only"
                  />

                  <span className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 bg-white transition peer-checked:border-red-500 peer-checked:bg-red-500">
                    {rememberMe && (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 12L10 17L19 7"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>

                  <span>Se souvenir de moi</span>
                </label>

                <button
                  type="button"
                  className="text-left font-medium text-red-500 transition hover:text-red-600 sm:text-right"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="group flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-red-500 px-6 font-semibold text-white shadow-lg shadow-red-500/15 transition duration-200 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  {isLoading
                    ? "Connexion..."
                    : "Se connecter"}
                </span>

                {!isLoading && (
                  <ArrowRight
                    size={19}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                )}
              </button>
            </form>
          )}

          {/* Pas d'inscription publique */}
          <div className="mt-8 border-t border-slate-200 pt-7 text-center">
            <p className="text-sm leading-6 text-slate-500">
              Votre accès est créé par votre gestionnaire.
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Si vous avez reçu une invitation, utilisez
              l&apos;adresse e-mail associée à votre compte.
            </p>
          </div>

          <p className="mt-10 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Alteract Gestion Locative
          </p>
        </div>
      </section>
    </main>
  );
}

/* ===============================================================
   COMPOSANT AVANTAGE
================================================================ */

function FeatureCard({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[108px] flex-col items-center justify-center rounded-xl border border-white/25 bg-black/15 px-2 py-4 text-center text-white backdrop-blur-[2px]">
      <div className="mb-2">
        {icon}
      </div>

      <div className="text-xs font-medium leading-[1.35] xl:text-[13px]">
        {label}
      </div>
    </div>
  );
}