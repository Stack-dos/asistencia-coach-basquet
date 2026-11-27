import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { LinkList } from "@/components/LinkList";
import { PlayerForm } from "@/components/PlayerForm";
import { getCategory } from "@/data/categories";
import { listPlayers, type Membership } from "@/data/players";
import { createPlayer } from "@/data/players-actions";
import { formatDate } from "@/domain/players";
import { defaultDateInSeason, todayInArgentina } from "@/domain/season";

type Props = PageProps<"/clubes/[clubId]/categorias/[categoryId]/jugadores">;

// "2013 · Alta 02/03/2026 · Baja 15/05/2026"
function membershipDetail(membership: Membership): string {
  return [
    membership.player.birth_year,
    `Alta ${formatDate(membership.joined_on)}`,
    membership.left_on && `Baja ${formatDate(membership.left_on)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

// Lee la URL y la base (datos del request): va dentro de <Suspense>.
async function Players({ params, searchParams }: Props) {
  const { clubId, categoryId } = await params;
  const { bajas } = await searchParams;
  const includeInactive = bajas === "1";

  // El layout ya da 404 en estos casos, pero la página se renderiza en paralelo con él.
  const category = await getCategory(categoryId);
  if (!category || category.club_id !== clubId) notFound();
  const memberships = await listPlayers(category.id, { includeInactive });

  const basePath = `/clubes/${clubId}/categorias/${categoryId}/jugadores`;

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl">Plantel</h2>
          {/* AC3: el filtro viaja en la URL (?bajas=1), como la temporada. */}
          <Link href={includeInactive ? basePath : `${basePath}?bajas=1`}>
            {includeInactive
              ? "Ocultar dados de baja"
              : "Mostrar dados de baja"}
          </Link>
        </div>
        {memberships.length === 0 ? (
          <EmptyState
            title="Todavía no hay jugadores"
            description="Agregá el primero con el formulario de abajo."
          />
        ) : (
          <LinkList
            items={memberships.map((membership) => ({
              href: `${basePath}/${membership.id}`,
              label: `${membership.player.last_name}, ${membership.player.first_name}`,
              detail: membershipDetail(membership),
            }))}
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Agregar jugador</h2>
        <PlayerForm
          action={createPlayer.bind(null, category.id)}
          seasonYear={category.season_year}
          defaults={{
            firstName: "",
            lastName: "",
            birthYear: "",
            guardianName: "",
            guardianPhone: "",
            joinedOn: defaultDateInSeason(
              category.season_year,
              todayInArgentina(),
            ),
          }}
          submitLabel="Agregar jugador"
          pendingLabel="Agregando…"
        />
      </section>
    </>
  );
}

export default function CategoryPlayersPage({ params, searchParams }: Props) {
  return (
    <Suspense>
      <Players params={params} searchParams={searchParams} />
    </Suspense>
  );
}
