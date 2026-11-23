import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { LinkList } from "@/components/LinkList";
import { NameForm } from "@/components/NameForm";
import { listClubs } from "@/data/clubs";
import { createClub } from "@/data/clubs-actions";

// Lee la base con la sesión (dato del request): va dentro de <Suspense>.
async function ClubList() {
  const clubs = await listClubs();
  if (clubs.length === 0) {
    return (
      <EmptyState
        title="Todavía no tenés clubes"
        description="Cuando crees tu primer club, lo vas a ver acá."
      />
    );
  }
  return (
    <LinkList
      items={clubs.map((club) => ({
        href: `/clubes/${club.id}`,
        label: club.name,
      }))}
    />
  );
}

export default function ClubesPage() {
  return (
    <>
      <h1 className="text-4xl">Clubes</h1>
      <NameForm
        action={createClub}
        id="club-name"
        label="Nuevo club"
        submitLabel="Crear club"
        pendingLabel="Creando…"
      />
      <Suspense>
        <ClubList />
      </Suspense>
    </>
  );
}
