"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { Input } from "@/components/Input";
import type { AssignState } from "@/data/seasons-actions";
import { PLAYER_FIELD } from "@/domain/seasons";

export type AssignRow = {
  playerId: string;
  label: string;
  detail: string;
  /** Si ya tiene categoría en la temporada nueva, se muestra y no se puede volver a elegir. */
  assignedTo: string[];
};

type AssignFormProps = {
  // assignPlayers con clubId y temporada ya fijados con .bind.
  action: (prevState: AssignState, formData: FormData) => Promise<AssignState>;
  rows: AssignRow[];
  categories: { id: string; name: string }[];
  seasonYear: number;
  defaultJoinedOn: string;
};

// US-205: un selector "Categoría nueva / No sigue" por jugador y una sola fecha de alta para todos.
export function AssignForm({
  action,
  rows,
  categories,
  seasonYear,
  defaultJoinedOn,
}: AssignFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        id="season-joined-on"
        label="Fecha de alta en la categoría nueva"
        hint="La misma para todos los jugadores que pases."
        name="joined_on"
        type="date"
        defaultValue={values.joined_on ?? defaultJoinedOn}
        min={`${seasonYear}-01-01`}
        max={`${seasonYear}-12-31`}
        required
      />

      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const id = `assign-${row.playerId}`;
          const name = `${PLAYER_FIELD}${row.playerId}`;
          return (
            <li
              key={row.playerId}
              className="flex flex-col gap-2 rounded-lg border border-line-strong bg-surface px-4 py-3"
            >
              <div className="flex flex-col">
                <span id={id} className="font-semibold">
                  {row.label}
                </span>
                <span className="text-sm text-muted">{row.detail}</span>
              </div>
              {row.assignedTo.length > 0 ? (
                <p className="text-sm">
                  Ya está en {row.assignedTo.join(", ")}.
                </p>
              ) : (
                <select
                  // El nombre del jugador es la etiqueta del selector (lector de pantalla).
                  aria-labelledby={id}
                  name={name}
                  defaultValue={values[name] ?? ""}
                  className="min-h-11 rounded-lg border border-line-strong bg-surface px-3 text-base"
                >
                  {/* AC3: "No sigue" no crea pertenencia y no es una baja. */}
                  <option value="">No sigue</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </li>
          );
        })}
      </ul>

      <FormError message={state.error} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Pasando…" : "Pasar jugadores"}
      </Button>
    </form>
  );
}
