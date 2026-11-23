import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { getClub } from "@/data/clubs";
import { DeleteClubButton } from "./delete-club-button";
import { RenameClubForm } from "./rename-club-form";

// Lee la URL y la base (datos del request): va dentro de <Suspense>.
async function ClubDetail({
  params,
}: {
  params: PageProps<"/clubes/[clubId]">["params"];
}) {
  const { clubId } = await params;
  // null si no existe o es de otro entrenador (RLS lo oculta): para el usuario es lo mismo.
  const club = await getClub(clubId);
  if (!club) notFound();

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Clubes", href: "/clubes" }, { label: club.name }]}
      />
      <h1 className="text-4xl">{club.name}</h1>
      {/* Categorías: llegan en US-202. */}
      <EmptyState
        title="Todavía no hay categorías"
        description="Las categorías del club se van a ver acá."
      />
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Configuración del club</h2>
        {/* key: al cambiar el nombre, el form se recrea con el valor nuevo. */}
        <RenameClubForm key={club.name} club={club} />
        <DeleteClubButton club={club} />
      </section>
    </>
  );
}

export default function ClubPage({ params }: PageProps<"/clubes/[clubId]">) {
  return (
    <Suspense>
      <ClubDetail params={params} />
    </Suspense>
  );
}
