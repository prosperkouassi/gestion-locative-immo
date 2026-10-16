"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  LoaderCircle,
  Plus,
  Wrench,
  X,
} from "lucide-react";
import { useFormStatus } from "react-dom";

import { createMaintenanceRequestAction } from "./actions";

export type MaintenancePropertyOption = {
  id: string;
  name: string;
};

export type MaintenanceUnitOption = {
  id: string;
  propertyId: string;
  name: string;
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50";

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

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400"
    >
      {pending ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Enregistrement...
        </>
      ) : (
        <>
          <Wrench className="h-4 w-4" />
          Enregistrer
        </>
      )}
    </button>
  );
}

export default function MaintenanceCreateButton({
  properties,
  units,
  canManage,
}: {
  properties: MaintenancePropertyOption[];
  units: MaintenanceUnitOption[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [propertyId, setPropertyId] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const availableUnits = useMemo(() => {
    if (!propertyId) return units;
    return units.filter((unit) => unit.propertyId === propertyId);
  }, [units, propertyId]);

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/55 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div className="flex min-h-full items-center justify-center p-3 sm:p-5">
              <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-500">
                      Maintenance
                    </p>

                    <h3 className="mt-1 text-[18px] font-extrabold text-slate-900">
                      {canManage
                        ? "Créer une intervention"
                        : "Signaler un problème"}
                    </h3>

                    <p className="mt-1 text-[12px] text-slate-500">
                      {canManage
                        ? "Planifiez et suivez une intervention technique."
                        : "Décrivez le problème rencontré dans votre logement."}
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
                  action={createMaintenanceRequestAction}
                  className="flex min-h-0 flex-1 flex-col"
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
                          placeholder="Ex. Fuite sous l’évier de la cuisine"
                          className={inputClass}
                        />
                      </label>

                      <Field label="Priorité *">
                        <select
                          name="priority"
                          required
                          defaultValue="MEDIUM"
                          className={inputClass}
                        >
                          <option value="LOW">Faible</option>
                          <option value="MEDIUM">Moyenne</option>
                          <option value="HIGH">Haute</option>
                          <option value="URGENT">Urgente</option>
                        </select>
                      </Field>

                      {canManage ? (
                        <Field label="Statut *">
                          <select
                            name="status"
                            required
                            defaultValue="OPEN"
                            className={inputClass}
                          >
                            <option value="OPEN">Ouverte</option>
                            <option value="IN_PROGRESS">En cours</option>
                            <option value="PLANNED">Planifiée</option>
                            <option value="COMPLETED">Terminée</option>
                            <option value="CANCELLED">Annulée</option>
                          </select>
                        </Field>
                      ) : null}

                      <Field label="Bien">
                        <select
                          name="property_id"
                          value={propertyId}
                          onChange={(event) =>
                            setPropertyId(event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">Sélectionner...</option>
                          {properties.map((property) => (
                            <option key={property.id} value={property.id}>
                              {property.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label={canManage ? "Unité" : "Logement *"}>
                        <select
                          name="unit_id"
                          required={!canManage}
                          defaultValue=""
                          className={inputClass}
                        >
                          <option value="">Sélectionner...</option>
                          {availableUnits.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      {canManage ? (
                        <>
                          <Field label="Date planifiée">
                            <input
                              name="scheduled_for"
                              type="date"
                              className={inputClass}
                            />
                          </Field>

                          <Field label="Coût estimé">
                            <input
                              name="estimated_cost"
                              type="number"
                              min="0"
                              step="1"
                              className={inputClass}
                            />
                          </Field>

                          <Field label="Coût réel">
                            <input
                              name="actual_cost"
                              type="number"
                              min="0"
                              step="1"
                              className={inputClass}
                            />
                          </Field>

                          <Field label="Prestataire">
                            <input
                              name="provider_name"
                              maxLength={180}
                              className={inputClass}
                            />
                          </Field>

                          <Field label="Téléphone prestataire">
                            <input
                              name="provider_phone"
                              maxLength={80}
                              className={inputClass}
                            />
                          </Field>
                        </>
                      ) : null}

                      <label className="space-y-1.5 sm:col-span-2">
                        <span className="text-[12px] font-semibold text-slate-600">
                          Description
                        </span>

                        <textarea
                          name="description"
                          rows={4}
                          maxLength={2000}
                          placeholder="Décrivez le problème ou l’intervention..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                        />
                      </label>

                      {canManage ? (
                        <label className="space-y-1.5 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-slate-600">
                            Notes internes
                          </span>

                          <textarea
                            name="notes"
                            rows={3}
                            maxLength={2000}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                          />
                        </label>
                      ) : null}
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
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-red-600"
      >
        <Plus className="h-4 w-4" />
        {canManage ? "Nouvelle intervention" : "Signaler un problème"}
      </button>

      {modal}
    </>
  );
}
