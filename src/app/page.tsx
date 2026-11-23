import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { getCurrentUserEmail } from "@/data/user";

// Lee la sesión (dato del request): va dentro de <Suspense> para que el resto se prerenderice.
async function Actions() {
  const email = await getCurrentUserEmail();
  if (email) {
    return (
      <Link href="/clubes" className={buttonClasses()}>
        Ir a mis clubes
      </Link>
    );
  }
  return (
    <>
      <Link href="/registro" className={buttonClasses()}>
        Crear cuenta
      </Link>
      <Link href="/login" className={buttonClasses("onDark")}>
        Ingresar
      </Link>
    </>
  );
}

// TODO(nico): revisar y ajustar los textos; son un borrador armado a partir del CLAUDE.md.
const FEATURES = [
  {
    title: "Tus clubes y categorías",
    text: "Organizá cada club con sus categorías y el plantel de cada una.",
  },
  {
    title: "Asistencia por clase",
    text: "Cargá las clases del mes y marcá quién vino, quién faltó y quién empezó.",
  },
  {
    title: "Estadísticas automáticas",
    text: "Jugadores por mes, nuevos, abandonos, clases dadas y ranking de asistencia.",
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="bg-foreground px-6 pb-12 pt-16 text-background">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <Logo size={48} />
          <h1 className="font-display text-5xl font-bold uppercase leading-none tracking-wide">
            Asistencia a
            <br />
            Entrenamientos
          </h1>
          <p className="max-w-xl text-lg text-stone-300">
            Bienvenido, entrenador. Dejá la planilla de Excel: tomá asistencia
            en tus clases de básquet y obtené las estadísticas de tus planteles
            sin hacer cuentas.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Suspense>
              <Actions />
            </Suspense>
          </div>
        </div>
      </section>
      <main className="mx-auto grid w-full max-w-3xl gap-4 px-6 py-10 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="rounded-lg border border-line bg-surface p-4"
          >
            <h2 className="text-xl">{feature.title}</h2>
            <p className="text-muted">{feature.text}</p>
          </article>
        ))}
      </main>
    </>
  );
}
