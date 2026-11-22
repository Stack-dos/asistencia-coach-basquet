"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { signUp } from "@/data/auth";

export default function RegistroPage() {
  const [state, formAction, pending] = useActionState(signUp, {});

  if (state.success) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6">
        <h1 className="text-4xl">Revisá tu email</h1>
        <p role="status">{state.success}</p>
        <Link href="/login">Ir a ingresar</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 p-6">
      <h1 className="text-4xl">Crear cuenta</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <Input
          id="email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />

        <Input
          id="password"
          label="Contraseña"
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
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>

      <p>
        ¿Ya tenés cuenta? <Link href="/login">Ingresá</Link>
      </p>
    </main>
  );
}
