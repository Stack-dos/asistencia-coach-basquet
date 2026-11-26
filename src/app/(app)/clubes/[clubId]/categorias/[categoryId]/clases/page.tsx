import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DateForm } from "@/components/DateForm";
import { DeleteButton } from "@/components/DeleteButton";
import { EmptyState } from "@/components/EmptyState";
import { MonthPicker } from "@/components/MonthPicker";
import { getCategory } from "@/data/categories";
import { listSessions } from "@/data/sessions";
import {
  createSession,
  deleteSession,
  updateSessionDate,
} from "@/data/sessions-actions";
import { parseMonth } from "@/domain/months";
import { formatDate } from "@/domain/players";
import { defaultDateInSeason, todayInArgentina } from "@/domain/season";

type Props = PageProps<"/clubes/[clubId]/categorias/[categoryId]/clases">;

// Lee la URL y la base (datos del request): va dentro de <Suspense>.
async function Sessions({ params, searchParams }: Props) {
  const { clubId, categoryId } = await params;
  const { mes } = await searchParams;

  // El layout ya da 404 en estos casos, pero la página se renderiza en paralelo con él.
  const category = await getCategory(categoryId);
  if (!category || category.club_id !== clubId) notFound();

  const today = todayInArgentina();
  const month = parseMonth(mes, category.season_year, today);
  const sessions = await listSessions(category.id, month);

  // AC5: el navegador no deja elegir fuera de la temporada; la base lo vuelve a validar.
  const min = `${category.season_year}-01-01`;
  const max = `${category.season_year}-12-31`;

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Clases</h2>
        <MonthPicker
          basePath={`/clubes/${clubId}/categorias/${categoryId}/clases`}
          month={month}
          seasonYear={category.season_year}
        />
        {sessions.length === 0 ? (
          <EmptyState
            title="No hay clases este mes"
            description="Agregá la primera con el formulario de abajo."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((session) => (
              <li key={session.id}>
                {/* Plegado: abrirlo sólo para corregir (AC3). */}
                <details className="rounded-lg border border-line-strong bg-surface p-4">
                  <summary className="cursor-pointer font-semibold">
                    {formatDate(session.held_on)}
                  </summary>
                  <div className="mt-4 flex flex-col gap-4">
                    <DateForm
                      action={updateSessionDate.bind(
                        null,
                        category.id,
                        session.id,
                      )}
                      id={`held-on-${session.id}`}
                      name="held_on"
                      label="Cambiar fecha"
                      defaultValue={session.held_on}
                      min={min}
                      max={max}
                      submitLabel="Guardar fecha"
                      pendingLabel="Guardando…"
                      variant="secondary"
                    />
                    <DeleteButton
                      action={deleteSession.bind(null, category.id, session.id)}
                      triggerLabel="Eliminar clase"
                      title={`Eliminar la clase del ${formatDate(session.held_on)}`}
                      description="Se borra la clase de esta categoría. No se puede deshacer."
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Agregar clase</h2>
        <DateForm
          action={createSession.bind(null, category.id)}
          id="new-session"
          name="held_on"
          label="Fecha"
          defaultValue={defaultDateInSeason(category.season_year, today)}
          min={min}
          max={max}
          submitLabel="Agregar clase"
          pendingLabel="Agregando…"
        />
      </section>
    </>
  );
}

export default function CategorySessionsPage({ params, searchParams }: Props) {
  return (
    <Suspense>
      <Sessions params={params} searchParams={searchParams} />
    </Suspense>
  );
}
