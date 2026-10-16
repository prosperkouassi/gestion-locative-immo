"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { deleteMaintenanceRequestAction } from "./actions";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      Supprimer
    </button>
  );
}

export default function DeleteMaintenanceButton({
  requestId,
  status,
}: {
  requestId: string;
  status: string;
}) {
  const disabled = status === "COMPLETED";

  return (
    <form
      action={deleteMaintenanceRequestAction}
      onSubmit={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        if (!window.confirm("Supprimer définitivement cette intervention ?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="request_id" value={requestId} />
      <SubmitButton disabled={disabled} />
    </form>
  );
}
