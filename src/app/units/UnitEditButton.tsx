"use client";

import { useEffect, useState } from "react";
import {
  Home,
  LoaderCircle,
  Save,
  X,
} from "lucide-react";
import { useFormStatus } from "react-dom";

import { updateUnitAction } from "./actions";

type PropertyOption = {
  id: string;
  name: string;
  is_active: boolean;
};

type UnitData = {
  id: string;
  property_id: string;
  name: string;
  unit_type: string | null;
  floor: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  surface_area: number | null;
  monthly_rent: number | string | null;
  currency: string | null;
};

type UnitEditButtonProps = {
  unit: UnitData;
  properties: PropertyOption[];
};

function EditUnitSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400 disabled:opacity-80"
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

export default function UnitEditButton({
  unit,
  properties,
}: UnitEditButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
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
          aria-labelledby={`edit-unit-${unit.id}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:max-h-[90dvh] sm:rounded-3xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <Home className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-500">
                    Unité locative
                  </p>

                  <h3
                    id={`edit-unit-${unit.id}`}
                    className="mt-1 truncate text-[18px] font-extrabold text-slate-900"
                  >
                    Modifier {unit.name}
                  </h3>

                  <p className="mt-1 text-[12px] text-slate-500">
                    Mettez à jour les informations de cette unité.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Fermer la fenêtre"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              action={updateUnitAction}
              className="flex min-h-0 flex-1 flex-col"
            >
              <input
                type="hidden"
                name="unit_id"
                value={unit.id}
              />

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Bien *
                    </span>

                    <select
                      name="property_id"
                      required
                      defaultValue={unit.property_id}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    >
                      {properties.map((property) => (
                        <option
                          key={property.id}
                          value={property.id}
                        >
                          {property.name}
                          {property.is_active
                            ? ""
                            : " — inactif"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Nom de l’unité *
                    </span>

                    <input
                      name="name"
                      required
                      maxLength={180}
                      defaultValue={unit.name}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Type
                    </span>

                    <input
                      name="unit_type"
                      maxLength={100}
                      defaultValue={unit.unit_type ?? ""}
                      placeholder="Appartement, studio..."
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Étage
                    </span>

                    <input
                      name="floor"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={unit.floor ?? ""}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Chambres
                    </span>

                    <input
                      name="bedrooms"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={unit.bedrooms ?? ""}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Salles d’eau
                    </span>

                    <input
                      name="bathrooms"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={unit.bathrooms ?? ""}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Superficie (m²)
                    </span>

                    <input
                      name="surface_area"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={unit.surface_area ?? ""}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
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
                      defaultValue={unit.monthly_rent ?? 0}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <input
                    type="hidden"
                    name="currency"
                    value={unit.currency ?? "XOF"}
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Annuler
                </button>

                <EditUnitSubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
