"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  LoaderCircle,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useFormStatus } from "react-dom";

import { updatePaymentAction } from "./actions";
import type { PaymentScheduleOption } from "./PaymentCreateButton";

type EditablePayment = {
  id: string;
  rentScheduleId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  reference: string | null;
  notes: string | null;
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 min-w-[165px] items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400"
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

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[12px] font-semibold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function PaymentEditButton({
  payment,
  schedules,
}: {
  payment: EditablePayment;
  schedules: PaymentScheduleOption[];
}) {
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
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setOpen(false);
              }
            }}
          >
            <div className="flex min-h-full items-center justify-center p-3 sm:p-5">
              <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-500">
                      Paiement
                    </p>

                    <h3 className="mt-1 text-[18px] font-extrabold text-slate-900">
                      Modifier le paiement
                    </h3>
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

                <form action={updatePaymentAction} className="flex min-h-0 flex-1 flex-col">
                  <input type="hidden" name="payment_id" value={payment.id} />

                  <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-1.5 sm:col-span-2">
                        <span className="text-[12px] font-semibold text-slate-600">
                          Échéance *
                        </span>

                        <select
                          name="rent_schedule_id"
                          required
                          defaultValue={payment.rentScheduleId}
                          className={inputClass}
                        >
                          {schedules.map((schedule) => (
                            <option key={schedule.id} value={schedule.id}>
                              {schedule.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <Field label="Montant *">
                        <input
                          name="amount"
                          type="number"
                          min="1"
                          step="1"
                          required
                          defaultValue={payment.amount}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Date de paiement *">
                        <input
                          name="payment_date"
                          type="date"
                          required
                          defaultValue={payment.paymentDate}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Mode de paiement *">
                        <select
                          name="payment_method"
                          required
                          defaultValue={payment.paymentMethod}
                          className={inputClass}
                        >
                          <option value="CASH">Espèces</option>
                          <option value="BANK_TRANSFER">Virement</option>
                          <option value="MOBILE_MONEY">Mobile Money</option>
                          <option value="CARD">Carte</option>
                          <option value="CHEQUE">Chèque</option>
                          <option value="OTHER">Autre</option>
                        </select>
                      </Field>

                      <Field label="Statut *">
                        <select
                          name="status"
                          required
                          defaultValue={payment.status}
                          className={inputClass}
                        >
                          <option value="COMPLETED">Complété</option>
                          <option value="PENDING">En attente</option>
                          <option value="CANCELLED">Annulé</option>
                        </select>
                      </Field>

                      <Field label="Référence">
                        <input
                          name="reference"
                          maxLength={120}
                          defaultValue={payment.reference ?? ""}
                          className={inputClass}
                        />
                      </Field>

                      <label className="space-y-1.5 sm:col-span-2">
                        <span className="text-[12px] font-semibold text-slate-600">
                          Notes
                        </span>

                        <textarea
                          name="notes"
                          rows={3}
                          maxLength={700}
                          defaultValue={payment.notes ?? ""}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="h-11 rounded-xl border border-slate-200 px-5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
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
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <Pencil className="h-3.5 w-3.5" />
        Modifier
      </button>

      {modal}
    </>
  );
}
