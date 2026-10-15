"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";
import { useFormStatus } from "react-dom";

type DeleteTenantButtonProps = {
  tenantName: string;
};

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400"
    >
      {pending ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Suppression...
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4" />
          Oui, supprimer
        </>
      )}
    </button>
  );
}

export default function DeleteTenantButton({
  tenantName,
}: DeleteTenantButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Supprimer
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-5"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:max-h-[90dvh] sm:rounded-3xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[18px] font-extrabold text-slate-900">
                    Supprimer le locataire ?
                  </h3>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Cette action est irréversible.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-[13px] leading-6 text-slate-700">
                Vous allez supprimer définitivement{" "}
                <strong>{tenantName}</strong>. La suppression sera
                automatiquement refusée si un bail ou un compte portail est
                encore lié à cette fiche.
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 rounded-xl border border-slate-200 px-5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <ConfirmButton />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
