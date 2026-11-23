import { EmptyState } from "@/components/EmptyState";

// Plantel de la categoría: llega en US-203.
export default function CategoryPlayersPage() {
  return (
    <EmptyState
      title="Todavía no hay jugadores"
      description="El plantel de la categoría se va a ver acá."
    />
  );
}
