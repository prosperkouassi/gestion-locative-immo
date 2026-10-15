"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, UserRound, X } from "lucide-react";

import { createTenantAction } from "./actions";
import TenantSubmitButton from "./TenantSubmitButton";

export default function TenantCreateButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/55 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-tenant-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setOpen(false);
              }
            }}
          >
            <div className="flex min-h-full items-center justify-center p-3 sm:p-5">
              <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-500">
                        Nouveau locataire
                      </p>

                      <h3
                        id="create-tenant-title"
                        className="mt-1 text-[18px] font-extrabold text-slate-900"
                      >
                        Ajouter un locataire
                      </h3>

                      <p className="mt-1 text-[12px] text-slate-500">
                        Créez d’abord la fiche locataire. Le bail sera créé
                        séparément.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form
                  action={createTenantAction}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-1.5">
                        <span className="text-[12px] font-semibold text-slate-600">
                          Prénom *
                        </span>

                        <input
                          name="first_name"
                          required
                          maxLength={120}
                          className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                        />
                      </label>

                      <label className="space-y-1.5">
                        <span className="text-[12px] font-semibold text-slate-600">
                          Nom *
                        </span>

                        <input
                          name="last_name"
                          required
                          maxLength={120}
                          className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                        />
                      </label>

                      <label className="space-y-1.5 sm:col-span-2">
                        <span className="text-[12px] font-semibold text-slate-600">
                          Téléphone
                        </span>

                        <input
                          name="phone"
                          type="tel"
                          maxLength={40}
                          className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="h-11 rounded-xl border border-slate-200 px-5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Annuler
                    </button>

                    <TenantSubmitButton />
                  </div>
                </form>
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
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-red-600"
      >
        <Plus className="h-4 w-4" />
        Ajouter un locataire
      </button>

      {modal}
    </>
  );
}
