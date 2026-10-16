"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";

export default function DeleteDocumentButton({
  documentId,
}: {
  documentId: string;
}) {
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!window.confirm("Supprimer définitivement ce document ?")) return;

    setPending(true);

    try {
      const response = await fetch(`/api/documents?id=${encodeURIComponent(documentId)}`, {
        method: "DELETE",
      });

      const result = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        window.alert(result?.message ?? "Impossible de supprimer le document.");
        return;
      }

      window.location.reload();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={remove}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
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
