"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { signIn } from "@/data/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, {});

  return (
    <>
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
          name="password"
          type="password"
          autoComplete="current-password"
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
          {pending ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <Link href="/recuperar">¿Olvidaste tu contraseña?</Link>
        <p>
          ¿No tenés cuenta? <Link href="/registro">Registrate</Link>
        </p>
      </div>
    </>
  );
}
