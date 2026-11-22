import { Suspense } from "react";
import { signOut } from "@/data/auth";
import { getCurrentUserEmail } from "@/data/user";

// Lee la sesión (dato del request): va dentro de <Suspense>.
async function Greeting() {
  const email = await getCurrentUserEmail();
  return <p>Hola, {email}</p>;
}

// shortcut: página mínima para probar la sesión; US-103 la reemplaza por el listado de clubes.
export default function ClubesPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Clubes</h1>
      <Suspense fallback={<p>Cargando…</p>}>
        <Greeting />
      </Suspense>
      <form action={signOut}>
        <button type="submit" className="rounded border px-4 py-2">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
