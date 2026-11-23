import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/EmptyState";
import { listClubs } from "@/data/clubs";
import { CreateClubForm } from "./create-club-form";

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
    <ul className="flex flex-col gap-2">
      {clubs.map((club) => (
        <li key={club.id}>
          <Link
            href={`/clubes/${club.id}`}
            className="flex min-h-11 items-center rounded-lg border border-line-strong bg-surface px-4 py-3 font-semibold"
          >
            {club.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ClubesPage() {
  return (
    <>
      <h1 className="text-4xl">Clubes</h1>
      <CreateClubForm />
      <Suspense>
        <ClubList />
      </Suspense>
    </>
  );
}
