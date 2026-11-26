import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/Button";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Guía de uso" };

// Sin sesión ni base: estática, se genera en el build.
// Al terminar US-302 (asistencia), sumar su paso acá.
const STEPS = [
  {
    title: "Creá tu club",
    text: "En Clubes, escribí el nombre en “Nuevo club” y tocá Crear club. Si dirigís en varios clubes o escuelitas, creá uno por cada uno.",
  },
  {
    title: "Creá las categorías",
    text: "Entrá al club. Las categorías son por temporada (año): elegí el año arriba, escribí el nombre en “Nueva categoría” (por ejemplo, U13) y tocá Crear categoría.",
  },
  {
    title: "Dá de alta a los jugadores",
    text: "Entrá a la categoría, pestaña Jugadores. Completá nombre, apellido, año de nacimiento (opcional) y la fecha de alta, y tocá Agregar jugador. La fecha de alta es el día que empezó: así la app sabe quién es nuevo.",
  },
  {
    title: "Planificá las clases del mes",
    text: "En la categoría, pestaña Clases, elegí el mes con las flechas y agregá cada día que hubo (o va a haber) entrenamiento. Si te equivocaste de fecha, tocá la clase para cambiarla o eliminarla.",
  },
  {
    title: "Si un jugador deja",
    text: "Tocá su nombre en el plantel y usá Dar de baja con la fecha. Cuenta como abandono en las estadísticas. Si vuelve, usá Volver a cargar.",
  },
  {
    title: "Cuando empieza un año nuevo",
    text: "En la página del club, tocá “Iniciar la temporada…”: copiás las categorías del año anterior y pasás a cada jugador a su categoría nueva.",
  },
];

export default function GuiaPage() {
  return (
    <>
      <div className="bg-foreground px-6 pb-6 pt-12 text-background">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide text-background no-underline"
          >
            <Logo />
            Asistencia a Entrenamientos
          </Link>
          <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide">
            Guía de uso
          </h1>
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <p className="text-muted">
          El orden es: club → categorías → jugadores → clases.
        </p>
        <ol className="flex flex-col gap-4">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-lg border border-line bg-surface p-4"
            >
              <span
                aria-hidden="true"
                className="font-display text-3xl font-bold leading-none text-accent"
              >
                {index + 1}
              </span>
              <div>
                <h2 className="text-xl">{step.title}</h2>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/clubes" className={`${buttonClasses()} self-start`}>
          Empezar
        </Link>
      </main>
    </>
  );
}
