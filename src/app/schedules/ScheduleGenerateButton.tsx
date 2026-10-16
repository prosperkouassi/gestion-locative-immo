"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarPlus2,
  LoaderCircle,
  X,
} from "lucide-react";
import { useFormStatus } from "react-dom";

import { generateLeaseSchedulesAction } from "./actions";

type LeaseOption = {
  id: string;
  label: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400"
    >
      {pending ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <CalendarPlus2 className="h-4 w-4" />
          Générer les échéances
        </>
      )}
    </button>
  );
}

export default function ScheduleGenerateButton({
  leases,
}: {
  leases: LeaseOption[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow =
        previousOverflow;
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [open]);

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/55 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget
              ) {
                setOpen(false);
              }
            }}
          >
            <div className="flex min-h-full items-center justify-center p-3 sm:p-5">
              <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-500">
                      Échéancier
                    </p>

                    <h3 className="mt-1 text-[18px] font-extrabold text-slate-900">
                      Générer les échéances
                    </h3>

                    <p className="mt-1 text-[12px] text-slate-500">
                      Les échéances déjà présentes
                      ne seront pas recréées.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form
                  action={
                    generateLeaseSchedulesAction
                  }
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto px-5 py-5 sm:px-6">
                    <label className="space-y-1.5">
                      <span className="text-[12px] font-semibold text-slate-600">
                        Bail actif *
                      </span>

                      <select
                        name="lease_id"
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                      >
                        <option value="">
                          Sélectionner un bail...
                        </option>

                        {leases.map((lease) => (
                          <option
                            key={lease.id}
                            value={lease.id}
                          >
                            {lease.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {leases.length === 0 ? (
                      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
                        Aucun bail actif
                        disponible.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <button
                      type="button"
                      onClick={() =>
                        setOpen(false)
                      }
                      className="h-11 rounded-xl border border-slate-200 px-5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Annuler
                    </button>

                    <SubmitButton />
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
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white shadow-sm hover:bg-red-600"
      >
        <CalendarPlus2 className="h-4 w-4" />
        Générer
      </button>

      {modal}
    </>
  );
}
