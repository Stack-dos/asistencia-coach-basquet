import Link from "next/link";
import { Logo } from "@/components/Logo";

// Banda con el nombre de la app arriba de login, registro y recuperación (estilo "Cancha").
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="bg-foreground pb-6 pt-16 text-background">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-2 px-6">
          <Logo size={36} />
          <p className="font-display text-3xl font-bold uppercase leading-none tracking-wide">
            Asistencia a
            <br />
            Entrenamientos
          </p>
          <Link href="/guia" className="text-sm text-stone-300">
            ¿Cómo se usa? Mirá la guía
          </Link>
        </div>
      </div>
      {children}
    </>
  );
}
