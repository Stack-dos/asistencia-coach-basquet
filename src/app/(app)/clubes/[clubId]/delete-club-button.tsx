"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Club } from "@/data/clubs";
import { deleteClub } from "@/data/clubs-actions";

export function DeleteClubButton({ club }: { club: Club }) {
  const [error, setError] = useState<string>();
  // Transition: llama a la action fuera de un <form> y deja que su redirect navegue.
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <ConfirmDialog
        triggerLabel={pending ? "Eliminando…" : "Eliminar club"}
        title={`Eliminar ${club.name}`}
        description="Se borran el club y todo lo que tenga cargado. No se puede deshacer."
        confirmLabel="Eliminar"
        confirmText={club.name}
        onConfirm={() =>
          startTransition(async () => {
            const state = await deleteClub(club.id);
            if (state.error) setError(state.error);
          })
        }
      />
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-100 px-3 py-2 text-red-800"
        >
          {error}
        </p>
      )}
    </div>
  );
}
