"use client";

import { useEffect, useState } from "react";
import { FileText, LoaderCircle, Save, X } from "lucide-react";
import { useFormStatus } from "react-dom";

import { updateLeaseAction } from "./actions";

type LeaseEditButtonProps = {
  lease: {
    id: string;
    tenant_id: string;
    unit_id: string;
    status: string;
    start_date: string;
    end_date: string | null;
    effective_end_date: string | null;
    monthly_rent: number;
    security_deposit: number;
    payment_due_day: number;
  };
  tenants: { id: string; name: string }[];
  units: { id: string; name: string; propertyName: string }[];
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

export default function LeaseEditButton({
  lease,
  tenants,
  units,
}: LeaseEditButtonProps) {
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
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        Modifier
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-5"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:max-h-[90dvh] sm:rounded-3xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-500">
                    Contrat
                  </p>
                  <h3 className="mt-1 text-[18px] font-extrabold text-slate-900">
                    Modifier le bail
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
              action={updateLeaseAction}
              className="flex min-h-0 flex-1 flex-col"
            >
              <input type="hidden" name="lease_id" value={lease.id} />

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Locataire *
                    </span>
                    <select
                      name="tenant_id"
                      required
                      defaultValue={lease.tenant_id}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    >
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Unité *
                    </span>
                    <select
                      name="unit_id"
                      required
                      defaultValue={lease.unit_id}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    >
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.propertyName} — {unit.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Début *
                    </span>
                    <input
                      name="start_date"
                      type="date"
                      required
                      defaultValue={lease.start_date}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Fin contractuelle
                    </span>
                    <input
                      name="end_date"
                      type="date"
                      defaultValue={lease.end_date ?? ""}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Fin effective
                    </span>
                    <input
                      name="effective_end_date"
                      type="date"
                      defaultValue={lease.effective_end_date ?? ""}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Statut *
                    </span>
                    <select
                      name="status"
                      defaultValue={lease.status}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    >
                      <option value="DRAFT">Brouillon</option>
                      <option value="ACTIVE">Actif</option>
                      <option value="ENDED">Terminé</option>
                      <option value="TERMINATED">Résilié</option>
                      <option value="CANCELLED">Annulé</option>
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Loyer mensuel *
                    </span>
                    <input
                      name="monthly_rent"
                      type="number"
                      min="0"
                      step="1"
                      required
                      defaultValue={lease.monthly_rent}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Dépôt de garantie
                    </span>
                    <input
                      name="security_deposit"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={lease.security_deposit}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Jour d’échéance *
                    </span>
                    <input
                      name="payment_due_day"
                      type="number"
                      min="1"
                      max="31"
                      step="1"
                      required
                      defaultValue={lease.payment_due_day}
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
