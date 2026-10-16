"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";
import { useFormStatus } from "react-dom";

import { refundPaymentAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 min-w-[155px] items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400"
    >
      {pending ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Traitement...
        </>
      ) : (
        <>
          <RotateCcw className="h-4 w-4" />
          Rembourser
        </>
      )}
    </button>
  );
}

export default function RefundPaymentButton({
  paymentId,
  refundableAmount,
}: {
  paymentId: string;
  refundableAmount: number;
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

  const today = new Date().toISOString().slice(0, 10);

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
              <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-500">
                      Remboursement
                    </p>

                    <h3 className="mt-1 text-[18px] font-extrabold text-slate-900">
                      Rembourser le paiement
                    </h3>

                    <p className="mt-1 text-[12px] text-slate-500">
                      Le remboursement sera conservé dans l’historique financier.
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

                <form action={refundPaymentAction}>
                  <input type="hidden" name="payment_id" value={paymentId} />

                  <div className="max-h-[calc(100dvh-13rem)] space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
                      Montant encore remboursable :{" "}
                      <strong>
                        {new Intl.NumberFormat("fr-FR").format(refundableAmount)} F CFA
                      </strong>
                    </div>

                    <label className="space-y-1.5">
                      <span className="text-[12px] font-semibold text-slate-600">
                        Montant *
                      </span>

                      <input
                        name="refund_amount"
                        type="number"
                        min="1"
                        max={refundableAmount}
                        step="1"
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-[12px] font-semibold text-slate-600">
                        Date de remboursement *
                      </span>

                      <input
                        name="refund_date"
                        type="date"
                        required
                        defaultValue={today}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-[12px] font-semibold text-slate-600">
                        Référence
                      </span>

                      <input
                        name="reference"
                        maxLength={120}
                        placeholder="Ex. REMB-2026-001"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-[12px] font-semibold text-slate-600">
                        Motif
                      </span>

                      <textarea
                        name="reason"
                        rows={3}
                        maxLength={500}
                        placeholder="Motif du remboursement..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                      />
                    </label>
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
        disabled={refundableAmount <= 0}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Rembourser
      </button>

      {modal}
    </>
  );
}
