"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useFormStatus } from "react-dom";

export default function PropertySubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 min-w-[170px] items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-[13px] font-bold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400"
    >
      {pending ? (
        <><LoaderCircle className="h-4 w-4 animate-spin" />Création...</>
      ) : (
        <><Plus className="h-4 w-4" />Créer le bien</>
      )}
    </button>
  );
}
