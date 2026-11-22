import { EmptyState } from "@/components/EmptyState";

// shortcut: sin datos todavía; US-201 agrega el listado y el alta de clubes.
export default function ClubesPage() {
  return (
    <>
      <h1 className="text-4xl">Clubes</h1>
      <EmptyState
        title="Todavía no tenés clubes"
        description="Cuando crees tu primer club, lo vas a ver acá."
      />
    </>
  );
}
