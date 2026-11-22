"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/data/auth";

export default function RecuperarPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {});

  if (state.success) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">Revisá tu email</h1>
        <p role="status">{state.success}</p>
        <Link href="/login" className="underline">
          Volver a ingresar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
      <p>
        Ingresá tu email y te mandamos un enlace para elegir una contraseña
        nueva.
      </p>

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
          {pending ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>

      <Link href="/login" className="underline">
        Volver a ingresar
      </Link>
    </main>
  );
}
