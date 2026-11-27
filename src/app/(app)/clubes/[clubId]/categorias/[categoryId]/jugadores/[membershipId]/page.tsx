import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DateForm } from "@/components/DateForm";
import { DeleteButton } from "@/components/DeleteButton";
import { PlayerForm } from "@/components/PlayerForm";
import type { Category } from "@/data/categories";
import { getCategory } from "@/data/categories";
import { getMembership, listPlayers, type Membership } from "@/data/players";
import {
  deletePlayer,
  markLeft,
  rejoinPlayer,
  updatePlayer,
} from "@/data/players-actions";
import { addDays, formatDate, phoneHref } from "@/domain/players";
import { defaultDateInSeason, todayInArgentina } from "@/domain/season";

type Props =
  PageProps<"/clubes/[clubId]/categorias/[categoryId]/jugadores/[membershipId]">;

// "AAAA-MM-DD": el orden alfabético es el orden de las fechas.
const latest = (a: string, b: string) => (a > b ? a : b);

// US-204: "Dar de baja" si la pertenencia está activa; "Volver a cargar" si está cerrada.
async function MembershipStatus({
  membership,
  category,
}: {
  membership: Membership;
  category: Category;
}) {
  const seasonStart = `${category.season_year}-01-01`;
  const seasonEnd = `${category.season_year}-12-31`;
  const suggested = defaultDateInSeason(
    category.season_year,
    todayInArgentina(),
  );

  if (!membership.left_on) {
    return (
      <section className="flex flex-col gap-3">
        <h3 className="text-xl">Dar de baja</h3>
        <p className="text-sm text-muted">
          Si dejó de venir. Deja de aparecer en el plantel y en las clases, pero
          su historial se conserva.
        </p>
        <DateForm
          action={markLeft.bind(null, membership.id)}
          id="left-on"
          name="left_on"
          label="Fecha de baja"
          defaultValue={latest(suggested, membership.joined_on)}
          min={membership.joined_on}
          max={seasonEnd}
          submitLabel="Dar de baja"
          pendingLabel="Guardando…"
          variant="danger"
        />
      </section>
    );
  }

  // Si ya lo volvieron a cargar, tiene otra pertenencia activa en la categoría.
  const active = await listPlayers(category.id);
  const alreadyBack = active.some((m) => m.player.id === membership.player.id);
  const firstPossible = latest(addDays(membership.left_on, 1), seasonStart);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xl">
        Dado de baja el {formatDate(membership.left_on)}
      </h3>
      {alreadyBack ? (
        <p className="text-sm text-muted">
          Ya volvió a la categoría: está en el plantel con otra fecha de alta.
        </p>
      ) : firstPossible > seasonEnd ? (
        <p className="text-sm text-muted">
          La baja fue el último día de la temporada: no se puede volver a cargar
          en esta categoría.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">
            Si volvió: se carga desde la fecha de vuelta. El tiempo que no vino
            queda como hueco y no cuenta como jugador nuevo.
          </p>
          <DateForm
            action={rejoinPlayer.bind(null, membership.id)}
            id="rejoin-on"
            name="joined_on"
            label="Fecha de vuelta"
            defaultValue={latest(suggested, firstPossible)}
            min={firstPossible}
            max={seasonEnd}
            submitLabel="Volver a cargar"
            pendingLabel="Guardando…"
          />
        </>
      )}
    </section>
  );
}

// Lee la URL y la base (datos del request): va dentro de <Suspense>.
async function EditPlayer({ params }: Pick<Props, "params">) {
  const { clubId, categoryId, membershipId } = await params;
  // 404 también si la URL junta una pertenencia con una categoría o un club que no son los suyos.
  const membership = await getMembership(membershipId);
  if (!membership || membership.category_id !== categoryId) notFound();
  const category = await getCategory(categoryId);
  if (!category || category.club_id !== clubId) notFound();

  const { player } = membership;
  const fullName = `${player.first_name} ${player.last_name}`;

  return (
    <section className="flex flex-col gap-4">
      <Link href={`/clubes/${clubId}/categorias/${categoryId}/jugadores`}>
        ← Volver al plantel
      </Link>
      <h2 className="text-2xl">Editar a {fullName}</h2>
      {/* AC3: tocar el teléfono abre el marcador del celular. */}
      {player.guardian_phone && (
        <p>
          Contacto{player.guardian_name && `: ${player.guardian_name}`} ·{" "}
          <a href={phoneHref(player.guardian_phone)}>{player.guardian_phone}</a>
        </p>
      )}
      <p className="text-sm text-muted">
        El nombre, el año de nacimiento y el contacto son de la persona: el
        cambio se ve en todas sus categorías. La fecha de alta es sólo de esta
        categoría.
      </p>
      <PlayerForm
        action={updatePlayer.bind(null, membership.id)}
        seasonYear={category.season_year}
        defaults={{
          firstName: player.first_name,
          lastName: player.last_name,
          birthYear: player.birth_year?.toString() ?? "",
          joinedOn: membership.joined_on,
          guardianName: player.guardian_name ?? "",
          guardianPhone: player.guardian_phone ?? "",
        }}
        submitLabel="Guardar cambios"
        pendingLabel="Guardando…"
      />

      <MembershipStatus membership={membership} category={category} />

      {/* AC4 de US-203: confirmación simple (sin escribir el nombre). */}
      <DeleteButton
        action={deletePlayer.bind(null, membership.id)}
        triggerLabel="Eliminar jugador"
        title={`Eliminar a ${fullName}`}
        description="Se quita de esta categoría. Si no está en otra categoría del club, también se borra del club. Usalo para corregir errores de carga; si dejó de venir, dalo de baja."
      />
    </section>
  );
}

export default function EditPlayerPage({ params }: Props) {
  return (
    <Suspense>
      <EditPlayer params={params} />
    </Suspense>
  );
}
