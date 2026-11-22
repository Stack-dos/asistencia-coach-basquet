"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/data/auth";

export default function RegistroPage() {
  const [state, formAction, pending] = useActionState(signUp, {});

  if (state.success) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">Revisá tu email</h1>
        <p role="status">{state.success}</p>
        <Link href="/login" className="underline">
          Ir a ingresar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded border px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password">Contraseña</label>
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
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <p>
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="underline">
          Ingresá
        </Link>
      </p>
    </main>
  );
}
