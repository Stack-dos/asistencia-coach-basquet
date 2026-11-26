"use client";

import { startTransition, useActionState, useState } from "react";
import { AttendanceToggle } from "@/components/AttendanceToggle";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import type { AttendanceRow } from "@/data/attendances";
import type { AttendanceFormState } from "@/data/attendances-actions";

// Client Component: el contador "X de Y" cambia en cada toque, sin ir al servidor.
export function AttendanceList({
  rows,
  action,
}: {
  rows: AttendanceRow[];
  // saveSessionAttendance con el sessionId ya fijado con .bind.
  action: (
    prevState: AttendanceFormState,
    formData: FormData,
  ) => Promise<AttendanceFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // Los jugadores que estaban al abrir la página. useState con función: se calcula una sola
  // vez y no cambia cuando el servidor manda filas nuevas.
  const [initialIds] = useState(
    () => new Set(rows.map((row) => row.player.id)),
  );
  // Sólo lo que el entrenador tocó; el resto sale de lo guardado. Sobrevive a los re-render que
  // provoca agregar un jugador (B: no se pierden los toques sin guardar).
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // AC4: un jugador que apareció después de abrir la página lo agregaron desde esta clase:
  // arranca presente.
  const isPresent = (row: AttendanceRow) =>
    touched[row.player.id] ?? (row.present || !initialIds.has(row.player.id));

  const presentCount = rows.filter(isPresent).length;
  const unsaved = rows.some((row) => isPresent(row) !== row.present);

  return (
    // onSubmit y no action={formAction}: con action, React llama a form.reset() al terminar,
    // y el reset nativo vuelve cada checkbox a su defaultChecked (false) sin que el estado de
    // React cambie: los tildes desaparecían y un segundo Guardar mandaba la lista vacía.
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        // En una transición, para que useActionState marque `pending`.
        startTransition(() => formAction(formData));
      }}
      className="flex flex-col gap-2"
    >
      {rows.map((row) => (
        <AttendanceToggle
          key={row.player.id}
          playerId={row.player.id}
          name={`${row.player.last_name}, ${row.player.first_name}`}
          checked={isPresent(row)}
          onChange={(checked) =>
            setTouched((prev) => ({ ...prev, [row.player.id]: checked }))
          }
        />
      ))}

      {/* sticky: con 20 jugadores el botón queda siempre a mano, sin scrollear hasta el final. */}
      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-background py-3">
        <FormError message={state.error} />
        <div className="flex items-center justify-between gap-3">
          {/* aria-live: el lector de pantalla anuncia el contador cuando cambia. */}
          <p aria-live="polite">
            <span className="font-semibold">
              {presentCount} de {rows.length} presentes
            </span>
            <span className="block text-sm text-muted">
              {unsaved
                ? "Cambios sin guardar"
                : state.saved
                  ? "Asistencia guardada"
                  : null}
            </span>
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
