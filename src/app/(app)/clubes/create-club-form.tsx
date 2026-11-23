"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { createClub } from "@/data/clubs-actions";
import { MAX_NAME_LENGTH } from "@/domain/names";

export function CreateClubForm() {
  const [state, formAction, pending] = useActionState(createClub, {});

  // shortcut: React vacía el form después de cada envío, también si hubo error; si molesta,
  // devolver el nombre en ClubState y usarlo como defaultValue.
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Input
        id="club-name"
        label="Nuevo club"
        name="name"
        maxLength={MAX_NAME_LENGTH}
        autoComplete="off"
        required
      />
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-100 px-3 py-2 text-red-800"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creando…" : "Crear club"}
      </Button>
    </form>
  );
}
