"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/Button";

type ConfirmDialogProps = {
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  // Si viene, hay que escribirlo exacto para habilitar el botón (RN-07: borrados en cascada).
  confirmText?: string;
  onConfirm: () => void;
};

export function ConfirmDialog({
  triggerLabel,
  title,
  description,
  confirmLabel,
  confirmText,
  onConfirm,
}: ConfirmDialogProps) {
  // Ids únicos por instancia: puede haber un diálogo por cada club de una lista.
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const canConfirm = confirmText === undefined || typed === confirmText;

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        onClick={() => dialogRef.current?.showModal()}
      >
        {triggerLabel}
      </Button>

      {/* onClose también corre al cerrar con Esc: limpia el texto para la próxima vez. */}
      <dialog
        ref={dialogRef}
        onClose={() => setTyped("")}
        aria-labelledby={`${id}-title`}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded bg-background p-6 text-foreground backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4">
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {title}
          </h2>
          <p>{description}</p>

          {confirmText !== undefined && (
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-text`}>
                Para confirmar, escribí <strong>{confirmText}</strong>
              </label>
              <input
                id={`${id}-text`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                className="rounded border px-3 py-2"
              />
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={!canConfirm}
              onClick={() => {
                onConfirm();
                close();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
