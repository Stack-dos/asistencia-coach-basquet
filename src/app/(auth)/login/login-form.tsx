"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/data/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, {});

  return (
    <>
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
            autoComplete="current-password"
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
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        <Link href="/recuperar" className="underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <p>
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="underline">
            Registrate
          </Link>
        </p>
      </div>
    </>
  );
}
