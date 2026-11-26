import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DateForm } from "@/components/DateForm";
import { EmptyState } from "@/components/EmptyState";
import { LinkList } from "@/components/LinkList";
import { MonthPicker } from "@/components/MonthPicker";
import { getCategory } from "@/data/categories";
import { listSessions } from "@/data/sessions";
import { createSession } from "@/data/sessions-actions";
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
  const basePath = `/clubes/${clubId}/categorias/${categoryId}/clases`;

  // AC5: el navegador no deja elegir fuera de la temporada; la base lo vuelve a validar.
  const min = `${category.season_year}-01-01`;
  const max = `${category.season_year}-12-31`;

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Clases</h2>
        <MonthPicker
          basePath={basePath}
          month={month}
          seasonYear={category.season_year}
        />
        {sessions.length === 0 ? (
          <EmptyState
            title="No hay clases este mes"
            description="Agregá la primera con el formulario de abajo."
          />
        ) : (
          // US-302: tocar la clase abre su toma de asistencia (cambiar fecha y eliminar, ahí).
          <LinkList
            items={sessions.map((session) => ({
              href: `${basePath}/${session.id}`,
              label: formatDate(session.held_on),
              detail: "Tomar asistencia",
            }))}
          />
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
