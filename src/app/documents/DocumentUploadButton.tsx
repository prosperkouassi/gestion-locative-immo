"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  FilePlus2,
  LoaderCircle,
  Upload,
  X,
} from "lucide-react";

export type DocumentEntityOption = {
  id: string;
  label: string;
};

export type DocumentUnitOption = {
  id: string;
  propertyId: string;
  label: string;
};

type UploadOptions = {
  owners: DocumentEntityOption[];
  tenants: DocumentEntityOption[];
  properties: DocumentEntityOption[];
  units: DocumentUnitOption[];
  leases: DocumentEntityOption[];
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export default function DocumentUploadButton({
  options,
}: {
  options: UploadOptions;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [propertyId, setPropertyId] = useState("");

  /*
   * Verrou synchrone.
   *
   * Contrairement au state React, cette valeur est modifiée
   * immédiatement au premier clic. Elle empêche donc une deuxième
   * soumission même si React n'a pas encore eu le temps de refaire
   * le rendu avec submitting = true.
   */
  const submitLockRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitLockRef.current) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const visibleUnits = useMemo(() => {
    if (!propertyId) {
      return options.units;
    }

    return options.units.filter(
      (unit) => unit.propertyId === propertyId
    );
  }, [options.units, propertyId]);

  function closeModal() {
    if (submitLockRef.current) {
      return;
    }

    setError("");
    setPropertyId("");
    setOpen(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    /*
     * Protection immédiate contre le double clic.
     */
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const result = (await response
        .json()
        .catch(() => null)) as
        | {
            message?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          result?.message ??
            "Le document n’a pas pu être envoyé."
        );
      }

      /*
       * On garde le verrou actif jusqu'au rechargement.
       * Cela empêche toute nouvelle soumission pendant que la page
       * se rafraîchit.
       */
      window.location.reload();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Une erreur inattendue est survenue."
      );

      /*
       * En cas d'erreur uniquement, on autorise l'utilisateur
       * à réessayer.
       */
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/55 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-upload-title"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !submitLockRef.current
              ) {
                closeModal();
              }
            }}
          >
            <div className="flex min-h-full items-center justify-center p-3 sm:p-5">
              <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-500">
                      Bibliothèque documentaire
                    </p>

                    <h3
                      id="document-upload-title"
                      className="mt-1 text-[18px] font-extrabold text-slate-900"
                    >
                      Ajouter un document
                    </h3>

                    <p className="mt-1 text-[12px] text-slate-500">
                      Le fichier sera stocké dans l’espace privé de
                      votre organisation.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <fieldset
                    disabled={submitting}
                    className="min-w-0 border-0 p-0"
                  >
                    <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto px-5 py-5 sm:px-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-slate-600">
                            Titre *
                          </span>

                          <input
                            name="title"
                            required
                            maxLength={180}
                            placeholder="Ex. Bail signé — Appartement A01"
                            className={inputClass}
                          />
                        </label>

                        <label className="space-y-1.5">
                          <span className="text-[12px] font-semibold text-slate-600">
                            Type *
                          </span>

                          <select
                            name="document_type"
                            required
                            defaultValue="OTHER"
                            className={inputClass}
                          >
                            <option value="LEASE">
                              Bail
                            </option>

                            <option value="RECEIPT">
                              Reçu
                            </option>

                            <option value="QUITTANCE">
                              Quittance
                            </option>

                            <option value="INVOICE">
                              Facture
                            </option>

                            <option value="IDENTITY">
                              Identité
                            </option>

                            <option value="PROPERTY">
                              Bien
                            </option>

                            <option value="MAINTENANCE">
                              Maintenance
                            </option>

                            <option value="OTHER">
                              Autre
                            </option>
                          </select>
                        </label>

                        <label className="space-y-1.5">
                          <span className="text-[12px] font-semibold text-slate-600">
                            Fichier *
                          </span>

                          <input
                            name="file"
                            type="file"
                            required
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                            className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
                          />
                        </label>

                        <label className="space-y-1.5">
                          <span className="text-[12px] font-semibold text-slate-600">
                            Propriétaire
                          </span>

                          <select
                            name="owner_id"
                            defaultValue=""
                            className={inputClass}
                          >
                            <option value="">
                              Aucun
                            </option>

                            {options.owners.map((item) => (
                              <option
                                key={item.id}
                                value={item.id}
                              >
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1.5">
                          <span className="text-[12px] font-semibold text-slate-600">
                            Locataire
                          </span>

                          <select
                            name="tenant_id"
                            defaultValue=""
                            className={inputClass}
                          >
                            <option value="">
                              Aucun
                            </option>

                            {options.tenants.map((item) => (
                              <option
                                key={item.id}
                                value={item.id}
                              >
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1.5">
                          <span className="text-[12px] font-semibold text-slate-600">
                            Bien
                          </span>

                          <select
                            name="property_id"
                            value={propertyId}
                            onChange={(event) =>
                              setPropertyId(
                                event.target.value
                              )
                            }
                            className={inputClass}
                          >
                            <option value="">
                              Aucun
                            </option>

                            {options.properties.map(
                              (item) => (
                                <option
                                  key={item.id}
                                  value={item.id}
                                >
                                  {item.label}
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <label className="space-y-1.5">
                          <span className="text-[12px] font-semibold text-slate-600">
                            Unité
                          </span>

                          <select
                            name="unit_id"
                            defaultValue=""
                            className={inputClass}
                          >
                            <option value="">
                              Aucune
                            </option>

                            {visibleUnits.map((item) => (
                              <option
                                key={item.id}
                                value={item.id}
                              >
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1.5 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-slate-600">
                            Bail
                          </span>

                          <select
                            name="lease_id"
                            defaultValue=""
                            className={inputClass}
                          >
                            <option value="">
                              Aucun
                            </option>

                            {options.leases.map((item) => (
                              <option
                                key={item.id}
                                value={item.id}
                              >
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[12px] font-bold text-slate-800">
                            Visibilité portail
                          </p>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                              <input
                                type="checkbox"
                                name="is_visible_to_owner"
                                value="true"
                                className="mt-0.5 h-4 w-4 accent-red-500"
                              />

                              <span>
                                <span className="block text-[12px] font-semibold text-slate-700">
                                  Visible au propriétaire
                                </span>

                                <span className="mt-1 block text-[11px] text-slate-500">
                                  Le propriétaire lié pourra
                                  consulter ce fichier.
                                </span>
                              </span>
                            </label>

                            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                              <input
                                type="checkbox"
                                name="is_visible_to_tenant"
                                value="true"
                                className="mt-0.5 h-4 w-4 accent-red-500"
                              />

                              <span>
                                <span className="block text-[12px] font-semibold text-slate-700">
                                  Visible au locataire
                                </span>

                                <span className="mt-1 block text-[11px] text-slate-500">
                                  Le locataire lié pourra
                                  consulter ce fichier.
                                </span>
                              </span>
                            </label>
                          </div>
                        </div>

                        {error ? (
                          <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] font-semibold text-red-700">
                            {error}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </fieldset>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={submitting}
                      className="h-11 rounded-xl border border-slate-200 px-5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Annuler
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      aria-busy={submitting}
                      className="inline-flex h-11 min-w-[205px] items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white transition hover:bg-red-600 disabled:cursor-wait disabled:bg-red-400"
                    >
                      {submitting ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Ajouter le document
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {submitting ? (
                  <div className="border-t border-red-100 bg-red-50 px-5 py-2.5 text-center text-[11px] font-semibold text-red-600">
                    Envoi du fichier en cours. Ne fermez pas cette fenêtre.
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-red-600"
      >
        <FilePlus2 className="h-4 w-4" />
        Ajouter un document
      </button>

      {modal}
    </>
  );
}