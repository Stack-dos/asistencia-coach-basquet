import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DeleteButton } from "@/components/DeleteButton";
import { EmptyState } from "@/components/EmptyState";
import { LinkList } from "@/components/LinkList";
import { NameForm } from "@/components/NameForm";
import { SeasonPicker } from "@/components/SeasonPicker";
import { listCategories } from "@/data/categories";
import { createCategory } from "@/data/categories-actions";
import { getClub } from "@/data/clubs";
import { deleteClub, renameClub } from "@/data/clubs-actions";
import {
  currentSeasonYear,
  MIN_SEASON_YEAR,
  parseSeasonYear,
} from "@/domain/season";

type Props = PageProps<"/clubes/[clubId]">;

// Lee la URL y la base (datos del request): va dentro de <Suspense>.
async function ClubDetail({
  params,
  searchParams,
}: Pick<Props, "params" | "searchParams">) {
  const { clubId } = await params;
  const { temporada } = await searchParams;
  const year = parseSeasonYear(temporada, currentSeasonYear());

  // null si no existe o es de otro entrenador (RLS lo oculta): para el usuario es lo mismo.
  // Primero el club: con un id inválido, listCategories lanzaría 22P02 en vez de dar 404.
  const club = await getClub(clubId);
  if (!club) notFound();
  const categories = await listCategories(club.id, year);

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Clubes", href: "/clubes" }, { label: club.name }]}
      />
      <h1 className="text-4xl">{club.name}</h1>

      <section className="flex flex-col gap-4">
        <SeasonPicker basePath={`/clubes/${club.id}`} year={year} />
        {/* US-205: el año anterior tiene que existir en el rango de temporadas. */}
        {year > MIN_SEASON_YEAR && (
          <Link href={`/clubes/${club.id}/temporada/${year}`}>
            Iniciar la temporada {year} desde {year - 1}
          </Link>
        )}
        {categories.length === 0 ? (
          <EmptyState
            title={`Todavía no hay categorías en ${year}`}
            description="Creá la primera con el formulario de abajo."
          />
        ) : (
          <LinkList
            items={categories.map((category) => ({
              href: `/clubes/${club.id}/categorias/${category.id}`,
              label: category.name,
            }))}
          />
        )}
        {/* key: al cambiar de temporada, el form se recrea (vacío y sin error viejo). */}
        <NameForm
          key={year}
          action={createCategory.bind(null, club.id, year)}
          id="category-name"
          label={`Nueva categoría ${year}`}
          submitLabel="Crear categoría"
          pendingLabel="Creando…"
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Configuración del club</h2>
        {/* key: al cambiar el nombre, el form se recrea con el valor nuevo. */}
        <NameForm
          key={club.name}
          action={renameClub.bind(null, club.id)}
          id="club-rename"
          label="Nombre del club"
          defaultValue={club.name}
          submitLabel="Renombrar"
          pendingLabel="Guardando…"
          variant="secondary"
        />
        <DeleteButton
          action={deleteClub.bind(null, club.id)}
          name={club.name}
          triggerLabel="Eliminar club"
          title={`Eliminar ${club.name}`}
          description="Se borran el club, sus categorías y todo lo que tengan cargado. No se puede deshacer."
        />
      </section>
    </>
  );
}

export default function ClubPage({ params, searchParams }: Props) {
  return (
    <Suspense>
      <ClubDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}
