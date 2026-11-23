import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { listCategories } from "@/data/categories";
import { getClub } from "@/data/clubs";
import { listSeasonMemberships } from "@/data/seasons";
import { assignPlayers, copyCategories } from "@/data/seasons-actions";
import {
  defaultDateInSeason,
  MAX_SEASON_YEAR,
  MIN_SEASON_YEAR,
  todayInArgentina,
} from "@/domain/season";
import { seasonCandidates } from "@/domain/seasons";
import { AssignForm } from "./assign-form";

type Props = PageProps<"/clubes/[clubId]/temporada/[year]">;

// Lee la URL y la base (datos del request): va dentro de <Suspense>.
async function SeasonStart({ params }: Pick<Props, "params">) {
  const { clubId, year } = await params;
  const toYear = Number(year);
  // La temporada anterior también tiene que estar en el rango del check de la base.
  if (
    !/^\d{4}$/.test(year) ||
    toYear <= MIN_SEASON_YEAR ||
    toYear > MAX_SEASON_YEAR
  ) {
    notFound();
  }
  const fromYear = toYear - 1;

  // Primero el club: con un id inválido, las otras consultas lanzarían 22P02 en vez de dar 404.
  const club = await getClub(clubId);
  if (!club) notFound();
  const [fromCategories, toCategories, previous, next] = await Promise.all([
    listCategories(club.id, fromYear),
    listCategories(club.id, toYear),
    listSeasonMemberships(club.id, fromYear),
    listSeasonMemberships(club.id, toYear),
  ]);

  const existing = new Set(toCategories.map((c) => c.name));
  const missing = fromCategories.filter((c) => !existing.has(c.name));
  const candidates = seasonCandidates(previous, next);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Clubes", href: "/clubes" },
          { label: club.name, href: `/clubes/${club.id}?temporada=${toYear}` },
          { label: `Temporada ${toYear}` },
        ]}
      />
      <h1 className="text-4xl">Inicio de temporada {toYear}</h1>
      <p className="text-muted">
        Armá las categorías de {toYear} a partir de las de {fromYear} y pasá a
        cada jugador a su categoría nueva. {fromYear} no cambia.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">1. Categorías de {toYear}</h2>
        <p>
          {toCategories.length > 0
            ? toCategories.map((c) => c.name).join(", ")
            : "Todavía no hay."}
        </p>
        {missing.length > 0 ? (
          <form
            action={copyCategories.bind(null, club.id, fromYear, toYear)}
            className="flex flex-col gap-2"
          >
            <p className="text-sm text-muted">
              De {fromYear} faltan: {missing.map((c) => c.name).join(", ")}.
            </p>
            <Button type="submit" variant="secondary" className="self-start">
              Copiar categorías de {fromYear}
            </Button>
          </form>
        ) : (
          fromCategories.length === 0 && (
            <p className="text-sm text-muted">
              No hay categorías en {fromYear} para copiar. Creálas desde la
              página del club.
            </p>
          )
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">2. Pasar jugadores</h2>
        {candidates.length === 0 ? (
          <EmptyState
            title={`No hay jugadores activos al cierre de ${fromYear}`}
            description="Los que tienen baja no aparecen: ya cuentan como abandono."
          />
        ) : toCategories.length === 0 ? (
          <p className="text-muted">
            Primero copiá o creá las categorías de {toYear}.
          </p>
        ) : (
          <AssignForm
            action={assignPlayers.bind(null, club.id, toYear)}
            rows={candidates.map(({ player, previous, assignedTo }) => ({
              playerId: player.id,
              label: `${player.last_name}, ${player.first_name}`,
              detail: [`${fromYear}: ${previous.join(", ")}`, player.birth_year]
                .filter(Boolean)
                .join(" · "),
              assignedTo,
            }))}
            categories={toCategories}
            seasonYear={toYear}
            // shortcut: la PRD propone la primera clase del año; las clases llegan en US-301.
            defaultJoinedOn={defaultDateInSeason(toYear, todayInArgentina())}
          />
        )}
      </section>
    </>
  );
}

export default function SeasonStartPage({ params }: Props) {
  return (
    <Suspense>
      <SeasonStart params={params} />
    </Suspense>
  );
}
