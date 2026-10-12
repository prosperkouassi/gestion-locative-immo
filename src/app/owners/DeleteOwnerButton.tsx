"use client";

import { useState } from "react";
import {
  AlertTriangle,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";
import { useFormStatus } from "react-dom";

type DeleteOwnerButtonProps = {
  ownerName: string;
};

export default function DeleteOwnerButton({
  ownerName,
}: DeleteOwnerButtonProps) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);

  function openModal() {
    if (pending) {
      return;
    }

    setOpen(true);
  }

  function closeModal() {
    if (pending) {
      return;
    }

    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={pending}
        aria-disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Suppression...
          </>
        ) : (
          <>
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </>
        )}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <AlertTriangle className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-[18px] font-extrabold text-slate-900">
                    Confirmer la suppression
                  </h3>

                  <p className="mt-1 text-[13px] text-slate-500">
                    Cette action est définitive.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Fermer la fenêtre"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4">
                <p className="text-[14px] leading-6 text-slate-700">
                  Vous êtes sur le point de supprimer définitivement{" "}
                  <span className="font-bold text-slate-900">
                    {ownerName}
                  </span>
                  .
                </p>

                <p className="mt-2 text-[13px] text-slate-500">
                  Cette opération est irréversible. Si ce propriétaire possède
                  encore des biens liés ou un accès portail, la suppression sera
                  refusée automatiquement.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={pending}
                aria-disabled={pending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400"
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
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}