"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import type { Club } from "@/data/clubs";
import { renameClub } from "@/data/clubs-actions";
import { MAX_NAME_LENGTH } from "@/domain/names";

export function RenameClubForm({ club }: { club: Club }) {
  const [state, formAction, pending] = useActionState(
    renameClub.bind(null, club.id),
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Input
        id="club-rename"
        label="Nombre del club"
        name="name"
        defaultValue={club.name}
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
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="self-start"
      >
        {pending ? "Guardando…" : "Renombrar"}
      </Button>
    </form>
  );
}
