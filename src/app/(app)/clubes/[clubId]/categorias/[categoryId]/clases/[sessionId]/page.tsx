import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AttendanceList } from "@/components/AttendanceList";
import { DateForm } from "@/components/DateForm";
import { DeleteButton } from "@/components/DeleteButton";
import { EmptyState } from "@/components/EmptyState";
import { PlayerForm } from "@/components/PlayerForm";
import { getSessionAttendance } from "@/data/attendances";
import { saveSessionAttendance } from "@/data/attendances-actions";
import { getCategory } from "@/data/categories";
import { createPlayer } from "@/data/players-actions";
import { getSession } from "@/data/sessions";
import { deleteSession, updateSessionDate } from "@/data/sessions-actions";
import { formatDate } from "@/domain/players";

type Props =
  PageProps<"/clubes/[clubId]/categorias/[categoryId]/clases/[sessionId]">;

// Lee la URL y la base (datos del request): va dentro de <Suspense>.
async function SessionAttendance({ params }: Pick<Props, "params">) {
  const { clubId, categoryId, sessionId } = await params;
  // 404 también si la URL junta una clase con una categoría o un club que no son los suyos.
  const session = await getSession(sessionId);
  if (!session || session.category_id !== categoryId) notFound();
  const category = await getCategory(categoryId);
  if (!category || category.club_id !== clubId) notFound();

  const rows = await getSessionAttendance(session);
  const date = formatDate(session.held_on);
  const sessionsHref = `/clubes/${clubId}/categorias/${categoryId}/clases?mes=${session.held_on.slice(0, 7)}`;

  return (
    <>
      <section className="flex flex-col gap-4">
        <Link href={sessionsHref}>← Volver a las clases</Link>
        <h2 className="text-2xl">Clase del {date}</h2>
        {rows.length === 0 ? (
          <EmptyState
            title="No hay jugadores en la categoría ese día"
            description="Agregá al primero con el formulario de abajo."
          />
        ) : (
          <AttendanceList
            rows={rows}
            action={saveSessionAttendance.bind(null, session.id)}
          />
        )}
      </section>

      {/* AC4: el chico nuevo que vino a esta clase. Al agregarlo aparece arriba, presente;
          queda guardado con el botón Guardar. */}
      <details className="rounded-lg border border-line-strong bg-surface p-4">
        <summary className="cursor-pointer font-semibold">
          Agregar un jugador que vino hoy
        </summary>
        <div className="mt-4">
          <PlayerForm
            action={createPlayer.bind(null, category.id)}
            seasonYear={category.season_year}
            defaults={{
              firstName: "",
              lastName: "",
              birthYear: "",
              joinedOn: session.held_on,
            }}
            submitLabel="Agregar jugador"
            pendingLabel="Agregando…"
          />
        </div>
      </details>

      {/* US-301 AC3: se usa poco; plegado para no tapar la lista. */}
      <details className="rounded-lg border border-line-strong bg-surface p-4">
        <summary className="cursor-pointer font-semibold">
          Cambiar fecha o eliminar la clase
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <DateForm
            action={updateSessionDate.bind(null, category.id, session.id)}
            id="held-on"
            name="held_on"
            label="Fecha de la clase"
            defaultValue={session.held_on}
            min={`${category.season_year}-01-01`}
            max={`${category.season_year}-12-31`}
            submitLabel="Guardar fecha"
            pendingLabel="Guardando…"
            variant="secondary"
          />
          <DeleteButton
            action={deleteSession.bind(null, category.id, session.id)}
            triggerLabel="Eliminar clase"
            title={`Eliminar la clase del ${date}`}
            description="Se borran la clase y la asistencia que tenga cargada. No se puede deshacer."
          />
        </div>
      </details>
    </>
  );
}

export default function SessionAttendancePage({ params }: Props) {
  return (
    <Suspense>
      <SessionAttendance params={params} />
    </Suspense>
  );
}
