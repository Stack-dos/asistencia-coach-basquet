import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/Button";
import { signOut } from "@/data/auth";
import { getCurrentUserEmail } from "@/data/user";

// Lee la sesión (dato del request): va dentro de <Suspense> para que el resto se prerenderice.
async function UserEmail() {
  const email = await getCurrentUserEmail();
  return (
    <span className="min-w-0 truncate text-sm opacity-70" title={email ?? ""}>
      {email}
    </span>
  );
}

// Envuelve todas las páginas privadas. No chequea permisos: no se re-renderiza al navegar
// entre páginas hermanas. Eso lo hace proxy.ts en cada request.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link href="/clubes" className="shrink-0 font-semibold">
          Asistencia<span className="hidden sm:inline"> a Entrenamientos</span>
        </Link>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <Suspense>
            <UserEmail />
          </Suspense>
          <form action={signOut} className="shrink-0">
            <Button type="submit" variant="secondary">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
        {children}
      </main>
    </>
  );
}
