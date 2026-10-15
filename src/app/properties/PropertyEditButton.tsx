"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  LoaderCircle,
  Save,
  X,
} from "lucide-react";
import { useFormStatus } from "react-dom";

import { updatePropertyAction } from "./actions";

type OwnerOption = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
};

type PropertyData = {
  id: string;
  name: string;
  property_type: string | null;
  owner_id: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
};

type PropertyEditButtonProps = {
  property: PropertyData;
  owners: OwnerOption[];
};

function formatOwnerName(
  firstName: string | null,
  lastName: string | null
) {
  return (
    `${firstName ?? ""} ${lastName ?? ""}`.trim() ||
    "Propriétaire"
  );
}

function EditSubmitButton() {
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

export default function PropertyEditButton({
  property,
  owners,
}: PropertyEditButtonProps) {
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
          aria-labelledby={`edit-property-${property.id}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:max-h-[90dvh] sm:rounded-3xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <Building2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-500">
                    Bien immobilier
                  </p>

                  <h3
                    id={`edit-property-${property.id}`}
                    className="mt-1 truncate text-[18px] font-extrabold text-slate-900"
                  >
                    Modifier {property.name}
                  </h3>

                  <p className="mt-1 text-[12px] text-slate-500">
                    Mettez à jour les informations du bien.
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
              action={updatePropertyAction}
              className="flex min-h-0 flex-1 flex-col"
            >
              <input
                type="hidden"
                name="property_id"
                value={property.id}
              />

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Nom du bien *
                    </span>

                    <input
                      name="name"
                      required
                      maxLength={180}
                      defaultValue={property.name}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Type
                    </span>

                    <input
                      name="property_type"
                      maxLength={100}
                      defaultValue={property.property_type ?? ""}
                      placeholder="Résidence, immeuble, villa..."
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Propriétaire
                    </span>

                    <select
                      name="owner_id"
                      defaultValue={property.owner_id ?? ""}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    >
                      <option value="">
                        Aucun propriétaire
                      </option>

                      {owners.map((owner) => (
                        <option
                          key={owner.id}
                          value={owner.id}
                        >
                          {formatOwnerName(
                            owner.first_name,
                            owner.last_name
                          )}
                          {owner.is_active
                            ? ""
                            : " — inactif"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Adresse
                    </span>

                    <input
                      name="address"
                      maxLength={240}
                      defaultValue={property.address ?? ""}
                      placeholder="Adresse du bien"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Ville
                    </span>

                    <input
                      name="city"
                      maxLength={120}
                      defaultValue={property.city ?? ""}
                      placeholder="Ville"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-600">
                      Pays
                    </span>

                    <input
                      name="country"
                      maxLength={120}
                      defaultValue={property.country ?? ""}
                      placeholder="Pays"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                    />
                  </label>
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

                <EditSubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
