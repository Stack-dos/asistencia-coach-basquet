"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { requestPasswordReset } from "@/data/auth";

export default function RecuperarPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {});

  if (state.success) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6">
        <h1 className="text-4xl">Revisá tu email</h1>
        <p role="status">{state.success}</p>
        <Link href="/login">Volver a ingresar</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 p-6">
      <h1 className="text-4xl">Recuperar contraseña</h1>
      <p>
        Ingresá tu email y te mandamos un enlace para elegir una contraseña
        nueva.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <Input
          id="email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
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
          {pending ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>

      <Link href="/login">Volver a ingresar</Link>
    </main>
  );
}
