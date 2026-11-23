import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DeleteButton } from "@/components/DeleteButton";
import { NameForm } from "@/components/NameForm";
import { getCategory } from "@/data/categories";
import { deleteCategory, renameCategory } from "@/data/categories-actions";
import { getClub } from "@/data/clubs";
import { CategoryTabs } from "./category-tabs";

type Props = LayoutProps<"/clubes/[clubId]/categorias/[categoryId]">;

// Encabezado común a las 4 pestañas. Lee la URL y la base: va dentro de <Suspense>.
async function CategoryHeader({ params }: Pick<Props, "params">) {
  const { clubId, categoryId } = await params;
  const category = await getCategory(categoryId);
  // También 404 si la categoría existe pero la URL la pone bajo otro club.
  if (!category || category.club_id !== clubId) notFound();
  const club = await getClub(clubId);
  if (!club) notFound();

  const clubHref = `/clubes/${club.id}?temporada=${category.season_year}`;
  const basePath = `/clubes/${club.id}/categorias/${category.id}`;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Clubes", href: "/clubes" },
          { label: club.name, href: clubHref },
          { label: `${category.name} · ${category.season_year}` },
        ]}
      />
      <h1 className="text-4xl">{category.name}</h1>
      <CategoryTabs basePath={basePath} />

      {/* Plegado: se usa poco y no tiene que tapar la grilla. */}
      <details className="rounded-lg border border-line-strong bg-surface p-4">
        <summary className="cursor-pointer font-semibold">
          Configuración de la categoría
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          {/* key: al cambiar el nombre, el form se recrea con el valor nuevo. */}
          <NameForm
            key={category.name}
            action={renameCategory.bind(null, category.id)}
            id="category-rename"
            label="Nombre de la categoría"
            defaultValue={category.name}
            submitLabel="Renombrar"
            pendingLabel="Guardando…"
            variant="secondary"
          />
          <DeleteButton
            action={deleteCategory.bind(null, category.id)}
            name={category.name}
            triggerLabel="Eliminar categoría"
            title={`Eliminar ${category.name}`}
            description="Se borran la categoría y todo lo que tenga cargado. No se puede deshacer."
          />
        </div>
      </details>
    </>
  );
}

export default function CategoryLayout({ params, children }: Props) {
  return (
    <>
      <Suspense>
        <CategoryHeader params={params} />
      </Suspense>
      {children}
    </>
  );
}
