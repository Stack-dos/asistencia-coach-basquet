"use client";

import { useActionState } from "react";
import { updatePassword } from "@/data/auth";

// Privada: se llega desde el link de recuperación, que crea la sesión en /auth/confirm.
export default function NuevaContrasenaPage() {
  const [state, formAction, pending] = useActionState(updatePassword, {});

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Elegí una contraseña nueva</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="password">Contraseña nueva</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            aria-describedby="password-help"
            className="rounded border px-3 py-2"
          />
          <p id="password-help" className="text-sm opacity-70">
            Al menos 8 caracteres.
          </p>
        </div>

        {state.error && (
          <p role="alert" className="text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </main>
  );
}
