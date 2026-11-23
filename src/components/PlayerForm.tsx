"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { Input } from "@/components/Input";
import type { PlayerFormState } from "@/data/players-actions";
import { MAX_NAME_LENGTH } from "@/domain/names";
import type { PlayerFields } from "@/domain/players";

type PlayerFormProps = {
  // Server Action con sus ids ya fijados con .bind (createPlayer o updatePlayer).
  action: (
    prevState: PlayerFormState,
    formData: FormData,
  ) => Promise<PlayerFormState>;
  seasonYear: number;
  defaults: PlayerFields;
  submitLabel: string;
  pendingLabel: string;
};

// Alta y edición de jugadores (AC1, AC2). Se reutiliza en US-302.
export function PlayerForm({
  action,
  seasonYear,
  defaults,
  submitLabel,
  pendingLabel,
}: PlayerFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  // Si la action devolvió lo que se había escrito (error o "¿Es este jugador?"), se vuelve a
  // mostrar; si salió bien, el estado viene vacío y el form vuelve a los valores por defecto.
  const values = state.values ?? defaults;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Input
        id="player-first-name"
        label="Nombre"
        name="first_name"
        defaultValue={values.firstName}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="off"
        required
      />
      <Input
        id="player-last-name"
        label="Apellido"
        name="last_name"
        defaultValue={values.lastName}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="off"
        required
      />
      <Input
        id="player-birth-year"
        label="Año de nacimiento (opcional)"
        name="birth_year"
        defaultValue={values.birthYear}
        // numeric: teclado de números en el celular, sin las flechitas de type="number".
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        autoComplete="off"
      />
      <Input
        id="player-joined-on"
        label="Fecha de alta"
        name="joined_on"
        type="date"
        defaultValue={values.joinedOn}
        // El navegador no deja elegir fuera de la temporada (AC5); el servidor lo vuelve a validar.
        min={`${seasonYear}-01-01`}
        max={`${seasonYear}-12-31`}
        required
      />
      <FormError message={state.error} />

      {/* Primero en el form: es el que dispara Enter. */}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? pendingLabel : submitLabel}
      </Button>

      {state.matches && (
        <section
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-line-strong bg-background p-4"
        >
          <p className="font-semibold">
            Ya hay en el club alguien con ese nombre. ¿Es este jugador?
          </p>
          {/* Botones submit con name/value: el valor del botón tocado viaja en el FormData. */}
          {state.matches.map((player) => (
            <Button
              key={player.id}
              type="submit"
              name="existing_player_id"
              value={player.id}
              variant="secondary"
              disabled={pending}
              className="justify-start"
            >
              Sí: {player.last_name}, {player.first_name}
              {player.birth_year ? ` (${player.birth_year})` : ""}
            </Button>
          ))}
          <Button
            type="submit"
            name="force"
            value="1"
            variant="secondary"
            disabled={pending}
            className="justify-start"
          >
            No, es otra persona: crear jugador nuevo
          </Button>
        </section>
      )}
    </form>
  );
}
