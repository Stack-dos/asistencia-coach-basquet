import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/DeleteButton";
import { PlayerForm } from "@/components/PlayerForm";
import { getCategory } from "@/data/categories";
import { getMembership } from "@/data/players";
import { deletePlayer, updatePlayer } from "@/data/players-actions";

type Props =
  PageProps<"/clubes/[clubId]/categorias/[categoryId]/jugadores/[membershipId]">;

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
      <p className="text-sm text-muted">
        El nombre y el año de nacimiento son de la persona: el cambio se ve en
        todas sus categorías. La fecha de alta es sólo de esta categoría.
      </p>
      <PlayerForm
        action={updatePlayer.bind(null, membership.id)}
        seasonYear={category.season_year}
        defaults={{
          firstName: player.first_name,
          lastName: player.last_name,
          birthYear: player.birth_year?.toString() ?? "",
          joinedOn: membership.joined_on,
        }}
        submitLabel="Guardar cambios"
        pendingLabel="Guardando…"
      />
      {/* AC4: confirmación simple (sin escribir el nombre). */}
      <DeleteButton
        action={deletePlayer.bind(null, membership.id)}
        triggerLabel="Eliminar jugador"
        title={`Eliminar a ${fullName}`}
        description="Se quita de esta categoría. Si no está en otra categoría del club, también se borra del club. Usalo para corregir errores de carga; si dejó de venir, va a corresponder darlo de baja."
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
