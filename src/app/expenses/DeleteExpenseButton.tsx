"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { deleteExpenseAction } from "./actions";

function SubmitButton({
  disabled,
}: {
  disabled: boolean;
}) {
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

export default function DeleteExpenseButton({
  expenseId,
  status,
}: {
  expenseId: string;
  status: string;
}) {
  const disabled = status === "PAID";

  return (
    <form
      action={deleteExpenseAction}
      onSubmit={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        const confirmed = window.confirm(
          "Supprimer définitivement cette dépense ?"
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="expense_id" value={expenseId} />

      <SubmitButton disabled={disabled} />
    </form>
  );
}
