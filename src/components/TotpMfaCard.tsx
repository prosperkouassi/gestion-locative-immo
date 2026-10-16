"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type TotpFactor = {
  id: string;
  friendly_name?: string | null;
  status?: string;
};

function toQrDataUrl(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("data:")) {
    return trimmed;
  }

  if (trimmed.startsWith("<svg")) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}

export default function TotpMfaCard() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedFactors, setVerifiedFactors] = useState<TotpFactor[]>([]);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadFactors = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      setErrorMessage(
        "Impossible de vérifier l’état de l’authentification à deux facteurs."
      );
      setLoading(false);
      return;
    }

    const factors = (data?.totp ?? []).filter(
      (factor) => factor.status === "verified"
    ) as TotpFactor[];

    setVerifiedFactors(factors);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadFactors();
  }, [loadFactors]);

  const isEnabled = verifiedFactors.length > 0;

  async function startEnrollment() {
    setEnrolling(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setCopied(false);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Alteract Authenticator ${new Date().toISOString()}`,
    });

    if (error || !data?.id || !data.totp) {
      setErrorMessage(
        error?.message ||
          "Impossible de démarrer l’activation de l’Authenticator."
      );
      setEnrolling(false);
      return;
    }

    setFactorId(data.id);
    setQrCode(toQrDataUrl(data.totp.qr_code));
    setSecret(data.totp.secret);
    setVerificationCode("");
    setEnrolling(false);
  }

  async function verifyEnrollment() {
    if (!factorId) {
      setErrorMessage("Aucun facteur TOTP n’est en cours d’activation.");
      return;
    }

    const code = verificationCode.replace(/\s+/g, "");

    if (!/^\d{6}$/.test(code)) {
      setErrorMessage("Saisissez le code à 6 chiffres affiché dans votre application.");
      return;
    }

    setVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      setErrorMessage(
        "Le code est invalide ou a expiré. Attendez le prochain code et réessayez."
      );
      setVerifying(false);
      return;
    }

    setSuccessMessage(
      "Authentification à deux facteurs activée avec succès."
    );
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setVerificationCode("");
    setVerifying(false);
    await loadFactors();
  }

  async function copySecret() {
    if (!secret) return;

    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setErrorMessage("Impossible de copier automatiquement la clé secrète.");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            isEnabled ? "bg-emerald-50" : "bg-slate-100",
          ].join(" ")}
        >
          <ShieldCheck
            className={[
              "h-5 w-5",
              isEnabled ? "text-emerald-600" : "text-slate-600",
            ].join(" ")}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">
                Authentification à deux facteurs
              </h3>
              <p className="mt-1 text-[12px] leading-5 text-slate-500">
                Protégez votre compte avec Google Authenticator, Microsoft
                Authenticator ou toute autre application compatible TOTP.
              </p>
            </div>

            {loading ? (
              <span className="inline-flex items-center gap-2 self-start rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Vérification
              </span>
            ) : isEnabled ? (
              <span className="inline-flex items-center gap-1.5 self-start rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                <BadgeCheck className="h-3.5 w-3.5" />
                Activée
              </span>
            ) : (
              <span className="inline-flex self-start rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                Non activée
              </span>
            )}
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[12px] font-medium leading-5 text-red-700"
            >
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div
              role="status"
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[12px] font-medium leading-5 text-emerald-700"
            >
              {successMessage}
            </div>
          ) : null}

          {!loading && isEnabled && !factorId ? (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-[12px] font-bold text-emerald-800">
                    Votre Authenticator est configuré.
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-emerald-700/80">
                    À l’étape suivante, nous ajouterons la demande du code TOTP
                    après la connexion par e-mail et mot de passe.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {!loading && !isEnabled && !factorId ? (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-[11px] leading-5 text-slate-500">
                L’activation génère un QR code unique. Scannez-le avec votre
                application Authenticator puis confirmez avec le code à 6 chiffres.
              </p>

              <button
                type="button"
                onClick={startEnrollment}
                disabled={enrolling}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-[12px] font-bold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {enrolling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {enrolling ? "Préparation..." : "Activer l’Authenticator"}
              </button>
            </div>
          ) : null}

          {factorId && qrCode && secret ? (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="grid gap-5 lg:grid-cols-[190px_1fr] lg:items-start">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <img
                    src={qrCode}
                    alt="QR code pour configurer l’authentification TOTP"
                    className="mx-auto aspect-square w-full max-w-[165px]"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[12px] font-bold text-slate-900">
                      1. Scannez le QR code
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      Ouvrez Google Authenticator, Microsoft Authenticator ou une
                      autre application TOTP puis ajoutez un nouveau compte.
                    </p>
                  </div>

                  <div>
                    <p className="text-[12px] font-bold text-slate-900">
                      Clé manuelle
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      Utilisez cette clé uniquement si vous ne pouvez pas scanner
                      le QR code. Ne la partagez jamais.
                    </p>

                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <code className="min-w-0 flex-1 break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-700">
                        {secret}
                      </code>
                      <button
                        type="button"
                        onClick={copySecret}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? "Copiée" : "Copier"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block">
                      <span className="text-[12px] font-bold text-slate-900">
                        2. Saisissez le code à 6 chiffres
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(event) =>
                          setVerificationCode(
                            event.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                        placeholder="123456"
                        className="mt-2 h-11 w-full max-w-[220px] rounded-xl border border-slate-200 bg-white px-3.5 text-center text-[18px] font-extrabold tracking-[0.28em] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={verifyEnrollment}
                      disabled={verifying || verificationCode.length !== 6}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-[12px] font-bold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {verifying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      {verifying ? "Vérification..." : "Confirmer et activer"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFactorId(null);
                        setQrCode(null);
                        setSecret(null);
                        setVerificationCode("");
                        setErrorMessage(null);
                      }}
                      disabled={verifying}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
