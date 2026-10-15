"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Save, UserRound, X } from "lucide-react";
import { useFormStatus } from "react-dom";

import { updateTenantAction } from "./actions";

type TenantEditButtonProps = {
  tenant: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  };
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 min-w-[155px] items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400"
    >
      {pending ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Enregistrement...
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          Enregistrer
        </>
      )}
    </button>
  );
}

export default function TenantEditButton({
  tenant,
}: TenantEditButtonProps) {
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
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        Modifier
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`edit-tenant-${tenant.id}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:max-h-[90dvh] sm:rounded-3xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-500">
                    Locataire
                  </p>
                  <h3
                    id={`edit-tenant-${tenant.id}`}
                    className="mt-1 text-[18px] font-extrabold text-slate-900"
                  >
                    Modifier la fiche
                  </h3>
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

            <form
              action={updateTenantAction}
              className="flex min-h-0 flex-1 flex-col"
            >
              <input
                type="hidden"
                name="tenant_id"
                value={tenant.id}
              />

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Prénom *
                    </span>
                    <input
                      name="first_name"
                      required
                      maxLength={120}
                      defaultValue={tenant.first_name ?? ""}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
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
                      defaultValue={tenant.last_name ?? ""}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
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
                      defaultValue={tenant.phone ?? ""}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>
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
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
