import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { signOut } from "@/data/auth";
import { getCurrentUserEmail } from "@/data/user";

// Lee la sesión (dato del request): va dentro de <Suspense> para que el resto se prerenderice.
async function UserEmail() {
  const email = await getCurrentUserEmail();
  return (
    <span
      className="min-w-0 truncate text-sm text-stone-300"
      title={email ?? ""}
    >
      {email}
    </span>
  );
}

// Envuelve todas las páginas privadas. No chequea permisos: no se re-renderiza al navegar
// entre páginas hermanas. Eso lo hace proxy.ts en cada request.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="flex items-center gap-3 bg-foreground px-4 py-3 text-background sm:px-8">
        <Link
          href="/clubes"
          className="flex shrink-0 items-center gap-2 font-display text-xl font-bold uppercase tracking-wide text-background no-underline"
        >
          <Logo />
          <span>
            Asistencia
            <span className="hidden sm:inline"> a Entrenamientos</span>
          </span>
        </Link>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <Link href="/guia" className="shrink-0 text-sm text-background">
            Guía
          </Link>
          <Suspense>
            <UserEmail />
          </Suspense>
          <form action={signOut} className="shrink-0">
            <Button type="submit" variant="onDark">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:py-8">
        {children}
      </main>
    </>
  );
}
