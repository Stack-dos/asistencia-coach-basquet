"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { updatePassword } from "@/data/auth";

// Privada: se llega desde el link de recuperación, que crea la sesión en /auth/confirm.
export default function NuevaContrasenaPage() {
  const [state, formAction, pending] = useActionState(updatePassword, {});

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 p-6">
      <h1 className="text-4xl">Elegí una contraseña nueva</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <Input
          id="password"
          label="Contraseña nueva"
          hint="Al menos 8 caracteres."
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
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

        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </main>
  );
}
