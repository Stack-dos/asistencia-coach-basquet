"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormError } from "@/components/FormError";

type DeleteButtonProps = {
  // Server Action con el id ya fijado con .bind; si sale bien, redirige.
  action: () => Promise<{ error?: string }>;
  // Hay que escribirlo exacto para confirmar (RN-07).
  name: string;
  triggerLabel: string;
  title: string;
  description: string;
};

export function DeleteButton({
  action,
  name,
  triggerLabel,
  title,
  description,
}: DeleteButtonProps) {
  const [error, setError] = useState<string>();
  // Transition: llama a la action fuera de un <form> y deja que su redirect navegue.
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <ConfirmDialog
        triggerLabel={pending ? "Eliminando…" : triggerLabel}
        title={title}
        description={description}
        confirmLabel="Eliminar"
        confirmText={name}
        onConfirm={() =>
          startTransition(async () => {
            const state = await action();
            if (state.error) setError(state.error);
          })
        }
      />
      <FormError message={error} />
    </div>
  );
}
