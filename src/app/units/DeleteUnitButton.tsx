"use client";

import { useState, type MouseEvent } from "react";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { useFormStatus } from "react-dom";

type Props = { unitName: string };

export default function DeleteUnitButton({ unitName }: Props) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const stop = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={pending} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
        <Trash2 className="h-3.5 w-3.5" />Supprimer
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4" onMouseDown={() => !pending && setOpen(false)}>
          <div onMouseDown={stop} className="w-full max-w-md rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500"><AlertTriangle className="h-6 w-6" /></div><div><h3 className="text-[18px] font-extrabold text-slate-900">Supprimer l’unité ?</h3><p className="mt-1 text-[13px] text-slate-500">Cette action est irréversible.</p></div></div>
              <button type="button" onClick={() => setOpen(false)} disabled={pending} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-6 py-5 text-[14px] text-slate-700">Vous allez supprimer définitivement <strong>{unitName}</strong>. Alteract bloquera l’opération si un bail ou un historique de maintenance est lié.</div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5"><button type="button" onClick={() => setOpen(false)} disabled={pending} className="h-11 rounded-xl border border-slate-200 px-4 text-[13px] font-semibold">Annuler</button><button type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white disabled:bg-red-400">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Suppression...</> : <><Trash2 className="h-4 w-4" />Oui, supprimer</>}</button></div>
          </div>
        </div>
      ) : null}
    </>
  );
}
